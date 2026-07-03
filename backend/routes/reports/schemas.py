from typing import List, Optional, Any, Dict, Literal
from pydantic import BaseModel, model_validator
from datetime import datetime


class ReportRequest(BaseModel):
    """Unified schema for generating all report types."""
    report_type: Literal["track", "insight", "generic"]
    format: Literal["html", "pdf"] = "html"

    # Shared temporal filters (not used by insight)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    # Track / Generic specific
    vessel_ids: Optional[List[str]] = None
    aoi: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def validate_logical_consistency(self) -> "ReportRequest":
        # Rule 1: time range must be ordered correctly
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time.")

        # Rule 2: track reports require vessel_ids OR an AOI (not both, not neither)
        if self.report_type == "track":
            if not self.vessel_ids and not self.aoi:
                raise ValueError(
                    "track reports require either vessel_ids or aoi. "
                    "Provide at least one vessel ID, or draw an Area of Interest."
                )
            if self.vessel_ids and self.aoi:
                raise ValueError(
                    "track reports accept vessel_ids OR aoi — not both. "
                    "Clear one before submitting."
                )
            # AOI mode requires a time window to avoid unbounded queries
            if self.aoi and (not self.start_time or not self.end_time):
                raise ValueError(
                    "start_time and end_time are required for AOI-based track reports."
                )

        # Rule 3: generic reports require an AOI and a full time window
        if self.report_type == "generic":
            if not self.aoi:
                raise ValueError("aoi is required for generic reports.")
            if not self.start_time or not self.end_time:
                raise ValueError(
                    "start_time and end_time are both required for generic reports."
                )

        # Rule 4: insight reports take no parameters — extra fields are ignored
        # (no aoi, no time range, no vessel_ids needed)

        return self
