from pydantic import BaseModel
from typing import Optional
 
class SearchQuery(BaseModel):
    query: str
    filters: Optional[dict] = None 