from fastapi import APIRouter, HTTPException
from db import db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

def flatten_dict(d, parent_key='', sep='.'):
    """Flatten nested dict to get all scalar fields"""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        elif isinstance(v, list):
            # Skip lists for now, only show scalars
            continue
        else:
            items.append((new_key, v))
    return dict(items)

@router.get("/vessel-details/{vessel_id}")
async def get_vessel_details(vessel_id: int):
    """
    Fetch vessel details from lloyds_current collection by vessel_id.
    Returns all scalar fields (including nested) from the document.
    """
    try:
        collection = db["lloyds_current"]
        
        # Query by vessel_id (as integer/NumberLong)
        doc = await collection.find_one({"vessel_id": vessel_id})
        
        if not doc:
            raise HTTPException(status_code=404, detail=f"Vessel {vessel_id} not found in lloyds_current")
        
        # Remove MongoDB _id
        doc.pop('_id', None)
        
        # Flatten nested fields to get all scalars
        scalars = flatten_dict(doc)
        
        # Organize into categories for better UI display
        organized = {
            "vessel_id": vessel_id,
            "vessel": {},
            "engines": {},
            "design": {},
            "propulsion_and_dimensions": {},
            "capacities": {},
            "other": {}
        }
        
        for key, value in scalars.items():
            if key.startswith("vessel."):
                organized["vessel"][key.replace("vessel.", "")] = value
            elif key.startswith("engines."):
                organized["engines"][key.replace("engines.", "")] = value
            elif key.startswith("design."):
                organized["design"][key.replace("design.", "")] = value
            elif key.startswith("propulsion_and_dimensions."):
                organized["propulsion_and_dimensions"][key.replace("propulsion_and_dimensions.", "")] = value
            elif key.startswith("capacities."):
                organized["capacities"][key.replace("capacities.", "")] = value
            else:
                organized["other"][key] = value
        
        return organized
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching vessel details for {vessel_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
