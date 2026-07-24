from blurgs_observability import get_logger
from blurgs_observability.decorators.tracing_function import traced
from bson import ObjectId
from typing import Union
from pymongo import MongoClient
from pymongo.errors import OperationFailure
from core.schemas.chat import Session, Role, Message, User, SessionDocument, UserDocument
from dotenv import load_dotenv
import os
# Load environment variables
load_dotenv()




class ChatMongoClient():
    def __init__(self, uri: str=None):
        self.logger = get_logger()

        if uri:
            mongo_uri = uri
        else:
            # Build MongoDB URI with authentication if credentials are provided
            mongo_host = os.getenv("MONGO_HOST", "localhost")
            mongo_port = os.getenv("MONGO_PORT", "27017")
            mongo_username = os.getenv("MONGO_USERNAME")
            mongo_password = os.getenv("MONGO_PASSWORD")
            mongo_auth_source = os.getenv("MONGO_AUTH_SOURCE", "admin")
            
            if mongo_username and mongo_password:
                # URI with authentication
                mongo_uri = f"mongodb://{mongo_username}:{mongo_password}@{mongo_host}:{mongo_port}/?authSource={mongo_auth_source}"
            else:
                # URI without authentication
                mongo_uri = f"mongodb://{mongo_host}:{mongo_port}"
        
        db_name = os.getenv("MONGO_DB_NAME", "dev")
        self.logger = get_logger()
        client = MongoClient(mongo_uri)
        self.messages_collection = client[db_name]["chat_messages"]
        self.sessions_collection = client[db_name]["chat_sessions"]
        self.documents_collection = client[db_name]["documents_collection"]
        self.db = client[db_name]
        
        # Try to create index on session_id - handle auth errors gracefully
        try:
            self.messages_collection.create_index("session_id", sparse=True)
            self.logger.debug("Created index on session_id")
        except OperationFailure as e:
            self.logger.warning(f"Could not create index (auth issue): {e}")
        
        self.logger.info(f"Connected to MongoDB at {mongo_host}:{mongo_port}, using database '{db_name}'")

    @traced
    def insert_message(self, message: Message):
        self.logger.debug(f"Inserting message: session_id={message.session_id}, role={message.role}")
        result = self.messages_collection.insert_one(message.model_dump())
        self.logger.info(f"Inserted message with ID: {result.inserted_id}")
        return result.inserted_id

    @traced
    def insert_user_message(self, content: str, session_id: ObjectId | str):
        """Insert a user message - accepts ObjectId or string"""
        if isinstance(session_id, str):
            session_id = ObjectId(session_id)
        self.logger.debug(f"Creating user message for session_id: {session_id}")
        message = Message(session_id=session_id, role=Role.USER, content=content)
        return self.insert_message(message)

    @traced
    def insert_assistant_message(self, content: str, session_id: ObjectId | str):
        """Insert an assistant message - accepts ObjectId or string"""
        if isinstance(session_id, str):
            session_id = ObjectId(session_id)
        self.logger.debug(f"Creating assistant message for session_id: {session_id}")
        message = Message(session_id=session_id, role=Role.ASSISTANT, content=content)
        return self.insert_message(message)

    @traced
    def get_message(self, session_id: Union[str, ObjectId], last_n: int = 10, disable_chronology: bool = False):
        """Retrieve messages from a session - accepts ObjectId or string
        
        Args:
            session_id: The session ID to query
            last_n: Maximum number of messages to retrieve
            disable_chronology: If False (default), return in chronological order (oldest first).
                          If True, return in reverse chronological order (newest first).
        """
        if isinstance(session_id, str):
            session_id = ObjectId(session_id)
        
        self.logger.debug(f"Querying messages for session_id: {session_id} (type: {type(session_id).__name__})")
        
        # Sort by _id: descending (-1) to get newest messages first for limiting
        messages_db = list(self.messages_collection.find({"session_id": session_id}).sort("_id", -1).limit(last_n))
        self.logger.debug(f"Found {len(messages_db)} messages for session_id: {session_id}")
        
        if messages_db:
            self.logger.debug(f"First message: {messages_db[0]}")
        
        # Convert to Message objects
        messages = [Message(**msg) for msg in messages_db]
        
        # Return in chronological order by default (oldest first) unless disable_chronology=True
        if not disable_chronology:
            messages = list(reversed(messages))
        
        return messages

    @traced
    def new_session(self, user_id: ObjectId | str, title: str, summary: str = None):
        """Create a new session - accepts user_id as ObjectId or string"""
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        self.logger.debug(f"Creating new session for user_id: {user_id}, title: {title}")
        session = Session(user_id=user_id, title=title, summary=summary)
        self.logger.debug(f"Session dict: {session.model_dump()}")
        result = self.sessions_collection.insert_one(session.model_dump())
        self.logger.info(f"Created new session with ID: {result.inserted_id}")
        return result.inserted_id

    @traced
    def update_session_summary(self, session_id: ObjectId | str, summary: str):
        """Update session summary - accepts session_id as ObjectId or string
        
        Args:
            session_id: The session ID to update
            summary: The new summary text
        """
        if isinstance(session_id, str):
            session_id = ObjectId(session_id)
        self.logger.debug(f"Updating summary for session_id: {session_id}")
        result = self.sessions_collection.update_one(
            {"_id": session_id},
            {"$set": {"summary": summary}}
        )
        if result.matched_count == 0:
            self.logger.warning(f"No session found with ID: {session_id}")
        else:
            self.logger.info(f"Updated session summary for ID: {session_id}")
        return result.modified_count

    @traced
    def save_session_document(self, session_id: "ObjectId | str", file_path: str, document_type: str = "session") -> "ObjectId":
        """
        Record a file ingested for a session into the per_session_documents collection.

        Args:
            session_id: The session to associate this document with.
            file_path:  The full MinIO object path (e.g. "omnisense-docs/MV Asterion Dawn.pdf").
            document_type: The type of the document (e.g. "session" or "global").

        Returns:
            The ObjectId of the newly inserted document record (used as source_id).
        """
        from pathlib import Path
        import mimetypes

        if isinstance(session_id, str):
            session_id = ObjectId(session_id)

        file_name = Path(file_path).name
        mime_type, _ = mimetypes.guess_type(file_name)
        if mime_type is None:
            mime_type = "application/octet-stream"

        doc = SessionDocument(
            session_id=session_id,
            file_name=file_name,
            file_path=file_path,
            mime_type=mime_type,
            document_type=document_type
        )

        result = self.documents_collection.insert_one(
            doc.model_dump(by_alias=True)
        )
        self.logger.info(
            f"Saved session document '{file_name}' for session {session_id} "
            f"with ID: {result.inserted_id}"
        )
        return result.inserted_id

    @traced
    def get_user_id_by_username(self, username: str) -> "ObjectId | None":
        """
        Look up a user's _id by their username.

        Args:
            username: The username string from the JWT token's 'sub' claim.

        Returns:
            The user's ObjectId, or None if not found.
        """
        user = self.db.users.find_one({"username": username})
        if user:
            return user["_id"]
        self.logger.warning(f"get_user_id_by_username | No user found for username: {username}")
        return None

    @traced
    def save_user_document(self, file_path: str, user_id: "ObjectId | str", document_type: str = "global") -> "ObjectId":
        """
        Record a file ingested globally for a user into the per_user_documents collection.

        Args:
            file_path: The full MinIO object path (e.g. "omnisense-docs/report.pdf").
            user_id:   The ObjectId (or string) of the user who uploaded the document.
            document_type: The type of the document (e.g. "session" or "global").

        Returns:
            The ObjectId of the newly inserted document record (used as source_id).
        """
        from pathlib import Path
        import mimetypes

        if isinstance(user_id, str):
            user_id = ObjectId(user_id)

        file_name = Path(file_path).name
        mime_type, _ = mimetypes.guess_type(file_name)
        if mime_type is None:
            mime_type = "application/octet-stream"

        doc = UserDocument(
            user_id=user_id,
            file_name=file_name,
            file_path=file_path,
            mime_type=mime_type,
            document_type=document_type
        )

        result = self.documents_collection.insert_one(
            doc.model_dump(by_alias=True)
        )
        self.logger.info(
            f"Saved user document '{file_name}' for user {user_id} with ID: {result.inserted_id}"
        )
        return result.inserted_id

    @traced
    def list_enabled_documents(self, session_id: "ObjectId | str", user_id: "ObjectId | str") -> list[str]:
        """
        Return document IDs enabled for RAG from the current session and user's global documents.

        Args:
            session_id: The current session ID.
            user_id: The current user ID.

        Returns:
            A list of document _id values as strings.
        """
        if isinstance(session_id, str):
            session_id = ObjectId(session_id)
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)

        query = {
            "enabled": True,
            "$or": [
                {"session_id": session_id},
                {"user_id": user_id},
            ],
        }

        documents = self.documents_collection.find(query, {"_id": 1})
        document_ids = [str(document["_id"]) for document in documents]

        self.logger.info(
            f"Found {len(document_ids)} enabled documents for session_id={session_id}, user_id={user_id}"
        )
        return document_ids

    @traced
    def toggle_session_document_status(
        self,
        document_id: str,
        target_status: bool
    ) -> bool:
        """
        Enable or disable a document in the per_session_documents collection.

        Args:
            document_id: The ID of the document to toggle.
            target_status: The desired enabled state — True to enable, False to disable.
            session_id: Optional. When provided, the query is narrowed to documents
                        belonging to that specific session. When omitted, the first
                        document matching ``file_path`` across all sessions is updated.

        Returns:
            True  if the document exists (``enabled`` is now the desired state,
                  whether or not it was changed).
            False if no matching document was found.
        """
        try:
            doc_oid = ObjectId(document_id) if isinstance(document_id, str) else document_id
        except Exception:
            self.logger.warning(f"toggle_session_document_status | Invalid document_id format: {document_id}")
            return False
            
        query: dict = {"_id": doc_oid}

        self.logger.debug(
            f"toggle_session_document_status | query={query} | target_status={target_status}"
        )

        result = self.documents_collection.update_one(
            query,
            {"$set": {"enabled": target_status}},
        )

        if result.matched_count == 0:
            self.logger.warning(
                f"toggle_session_document_status | No document found for document_id='{document_id}'"
            )
            return False

        self.logger.info(
            f"toggle_session_document_status | Set enabled={target_status} for document_id='{document_id}'"
        )
        return True  # document exists; enabled is now the desired state

    @traced
    def clear_collections(self):
        try:
            self.messages_collection.delete_many({})
            self.sessions_collection.delete_many({})
            self.logger.info("Cleared messages and sessions collections")
        except OperationFailure as e:
            self.logger.error(f"Failed to clear collections: {e}")
            raise


if __name__ == "__main__":
    load_dotenv()
    
    client = ChatMongoClient()
    # Example usage
    session = Session(user_id="507f1f77bcf86cd799439011", title="Project Discussion")
    session_id = client.db.sessions.insert_one(session.dict(by_alias=True)).inserted_id
    print(f"Created session with ID: {session_id}")
    
    message = Message(session_id=session_id, role=Role.USER, content="Hello, how are you?")
    message_id = client.db.messages.insert_one(message.dict(by_alias=True)).inserted_id
    print(f"Created message with ID: {message_id}")
