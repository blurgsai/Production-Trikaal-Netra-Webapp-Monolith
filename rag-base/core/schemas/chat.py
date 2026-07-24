from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Annotated
from pydantic import BaseModel, Field, ConfigDict, field_serializer
from bson import ObjectId





class User(BaseModel):
    """Users collection schema - stores IDs as ObjectId"""
    id: Annotated[ObjectId, Field(alias="_id")] = Field(default_factory=ObjectId)
    username: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    password_hash: str = Field(..., min_length=1)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "username": "john_doe",
                "email": "john@example.com",
            }
        }
    )
    
    @field_serializer("id", when_used="json")
    def serialize_id(self, value: ObjectId) -> str:
        """Serialize ObjectId to string for JSON output"""
        return str(value)


class Session(BaseModel):
    """chat_sessions collection schema - stores IDs as ObjectId"""
    id: Annotated[ObjectId, Field(alias="_id")] = Field(default_factory=ObjectId)
    user_id: ObjectId = Field(..., description="Reference to the User")
    title: str = Field(..., min_length=1)
    summary: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "title": "Project Discussion",
                "summary": "Discussed project requirements and timeline",
                "updated_at": "2026-02-16T10:30:00"
            }
        }
    )
    
    @field_serializer("id", "user_id", when_used="json")
    def serialize_objectids(self, value: ObjectId) -> str:
        """Serialize ObjectId to string for JSON output"""
        return str(value)

class Role(str, Enum):
    """Enum for message roles"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class Message(BaseModel):
    """chat_messages collection schema - stores IDs as ObjectId"""
    id: Annotated[ObjectId, Field(alias="_id")] = Field(default_factory=ObjectId)
    session_id: ObjectId = Field(..., description="Reference to the parent Session")
    role: Role = Field(..., description="system, user, assistant, or tool")
    content: str = Field(..., min_length=1)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "session_id": "507f1f77bcf86cd799439012",
                "role": "user",
                "content": "What is the weather today?",
                "created_at": "2026-02-16T10:30:00"
            }
        }
    )
    
    @field_serializer("id", "session_id", when_used="json")
    def serialize_objectids(self, value: ObjectId) -> str:
        """Serialize ObjectId to string for JSON output"""
        return str(value)


class SessionDocument(BaseModel):
    """per_session_documents collection schema — one record per file ingested into a session."""
    id: Annotated[ObjectId, Field(alias="_id")] = Field(default_factory=ObjectId)
    session_id: ObjectId = Field(..., description="Reference to the parent Session")
    file_name: str = Field(..., description="Bare filename, e.g. 'report.pdf'")
    file_path: str = Field(..., description="Full MinIO object path, e.g. 'omnisense-docs/report.pdf'")
    enabled: bool = Field(default=True, description="Whether this document is active for RAG queries")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    mime_type: str = Field(default="application/octet-stream", description="MIME type of the file")
    document_type: str = Field(default="session", description="Type of the document, e.g., 'session' or 'global'")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "session_id": "507f1f77bcf86cd799439012",
                "file_name": "report.pdf",
                "file_path": "omnisense-docs/report.pdf",
                "enabled": True,
                "mime_type": "application/pdf",
                "document_type": "session"
            }
        }
    )

    @field_serializer("id", "session_id", when_used="json")
    def serialize_objectids(self, value: ObjectId) -> str:
        """Serialize ObjectId to string for JSON output"""
        return str(value)


class UserDocument(BaseModel):
    """per_user_documents collection schema — one record per file ingested globally for a user."""
    id: Annotated[ObjectId, Field(alias="_id")] = Field(default_factory=ObjectId)
    user_id: Optional[ObjectId] = Field(..., description="Reference to the User who uploaded this document")
    file_name: str = Field(..., description="Bare filename, e.g. 'report.pdf'")
    file_path: str = Field(..., description="Full MinIO object path, e.g. 'omnisense-docs/report.pdf'")
    enabled: bool = Field(default=True, description="Whether this document is active for RAG queries")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    mime_type: str = Field(default="application/octet-stream", description="MIME type of the file")
    document_type: str = Field(default="global", description="Type of the document, e.g., 'session' or 'global'")
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "file_name": "report.pdf",
                "file_path": "omnisense-docs/report.pdf",
                "enabled": True,
                "mime_type": "application/pdf",
                "document_type": "global"
            }
        }
    )

    @field_serializer("id", "user_id", when_used="json")
    def serialize_ids(self, value: ObjectId) -> str:
        """Serialize ObjectId to string for JSON output"""
        return str(value)


# Helper functions for ObjectId conversion
def str_to_objectid(s: str) -> ObjectId:
    """Convert string to ObjectId"""
    return ObjectId(s)


def objectid_to_str(oid: ObjectId) -> str:
    """Convert ObjectId to string"""
    return str(oid)
