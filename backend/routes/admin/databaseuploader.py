from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from pydantic import BaseModel
from utils.auth import get_current_user
from db import db
import csv
from io import StringIO
from typing import Optional

router = APIRouter(prefix="/database-uploads", tags=["admin-database-uploads"])

class FileMetadata(BaseModel):
    mmsi_column: str
    source: str
    category: str

def check_admin_role(current_user: dict = Depends(get_current_user)):
    """Dependency to check if current user has admin role"""
    user_role = current_user.get("role")
    if user_role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin role required."
        )
    return current_user

async def process(file_content: bytes, filename: str, metadata: FileMetadata):
    """
    Process uploaded CSV file and insert into MongoDB
    Each row becomes a document with mmsi, source, category, and information fields
    """
    print(f"[Processing] File: {filename}, Size: {len(file_content)} bytes")
    print(f"[Processing] MMSI Column: {metadata.mmsi_column}")
    print(f"[Processing] Source: {metadata.source}")
    print(f"[Processing] Category: {metadata.category}")
    
    try:
        # Decode CSV content
        csv_content = file_content.decode('utf-8')
        csv_reader = csv.DictReader(StringIO(csv_content))
        
        # Process rows and upsert into MongoDB
        rows_processed = 0
        upserted_count = 0
        updated_count = 0
        
        for row in csv_reader:
            # Check if mmsi_column exists in the row
            if metadata.mmsi_column not in row:
                print(f"[Processing] Warning: MMSI column '{metadata.mmsi_column}' not found in CSV")
                continue
            
            mmsi_value = row[metadata.mmsi_column]
            
            # Create document
            document = {
                "mmsi": mmsi_value,
                "source": metadata.source,
                "category": metadata.category,
                "information": row  # All CSV fields
            }
            
            # Upsert based on category + MMSI combination
            result = await db.admin_database_uploads.update_one(
                {"category": metadata.category, "mmsi": mmsi_value},
                {"$set": document},
                upsert=True
            )
            
            rows_processed += 1
            if result.upserted_id:
                upserted_count += 1
            elif result.modified_count > 0:
                updated_count += 1
        
        print(f"[Processing] Processed {rows_processed} rows: {upserted_count} inserted, {updated_count} updated")
        return {
            "rows_processed": rows_processed,
            "inserted_count": upserted_count,
            "updated_count": updated_count
        }
            
    except UnicodeDecodeError as e:
        print(f"[Processing] Error: Failed to decode CSV file - {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid CSV file encoding. Please use UTF-8.")
    except csv.Error as e:
        print(f"[Processing] Error: Invalid CSV format - {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
    except Exception as e:
        print(f"[Processing] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    mmsi_column: str = Form(...),
    source: str = Form(...),
    category: str = Form(...),
    current_user: dict = Depends(check_admin_role)
):
    """
    Upload file with required metadata
    Only accessible by users with admin role
    
    Required fields:
    - file: The file to upload
    - mmsi_column: Name of the MMSI column in the file
    - source: Data source identifier
    - category: Category classification
    """
    try:
        # Validate and create metadata object
        metadata = FileMetadata(
            mmsi_column=mmsi_column,
            source=source,
            category=category
        )
        
        # Read file content
        file_content = await file.read()
        
        # Process the file
        result = await process(file_content, file.filename, metadata)
        
        return {
            "success": True,
            "filename": file.filename,
            "size": len(file_content),
            "metadata": {
                "mmsi_column": metadata.mmsi_column,
                "source": metadata.source,
                "category": metadata.category
            },
            "processed": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@router.get("/categories")
async def get_categories(current_user: dict = Depends(check_admin_role)):
    """
    Get list of all unique categories
    Only accessible by users with admin role
    """
    try:
        # Get distinct categories from the collection
        categories = await db.admin_database_uploads.distinct("category")
        
        return {
            "success": True,
            "categories": categories,
            "count": len(categories)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch categories: {str(e)}")

@router.get("/category/{category}")
async def get_data_by_category(
    category: str,
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page"),
    current_user: dict = Depends(check_admin_role)
):
    """
    Get all data for a specific category with pagination
    Only accessible by users with admin role
    
    Parameters:
    - category: Category name to filter by
    - page: Page number (default: 1)
    - page_size: Number of items per page (default: 10, max: 100)
    """
    try:
        # Calculate skip value for pagination
        skip = (page - 1) * page_size
        
        # Get total count for this category
        total_count = await db.admin_database_uploads.count_documents({"category": category})
        
        if total_count == 0:
            return {
                "success": True,
                "category": category,
                "data": [],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_items": 0,
                    "total_pages": 0
                }
            }
        
        # Fetch paginated data
        cursor = db.admin_database_uploads.find(
            {"category": category},
            {"_id": 0}  # Exclude MongoDB _id field
        ).skip(skip).limit(page_size)
        
        data = await cursor.to_list(length=page_size)
        
        # Calculate total pages
        total_pages = (total_count + page_size - 1) // page_size
        
        return {
            "success": True,
            "category": category,
            "data": data,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_items": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")
