from typing import Dict, Any, List, Optional
import uuid
import time

class BaseRepository:
    """Base repository class with common data access patterns"""
    
    def __init__(self, data_store: List[Dict[str, Any]]):
        self.data_store = data_store
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new entity"""
        entity = {
            "id": str(uuid.uuid4()),
            "created_at": time.time(),
            **data
        }
        self.data_store.append(entity)
        return entity
    
    def find_by_id(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Find entity by ID"""
        return next((item for item in self.data_store if item["id"] == entity_id), None)
    
    def find_all(self) -> List[Dict[str, Any]]:
        """Get all entities"""
        return self.data_store.copy()
    
    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        """Find entities by field value"""
        return [item for item in self.data_store if item.get(field) == value]
    
    def update_by_id(self, entity_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update entity by ID"""
        entity = self.find_by_id(entity_id)
        if entity:
            entity.update(updates)
            return entity
        return None
    
    def delete_by_id(self, entity_id: str) -> bool:
        """Delete entity by ID"""
        original_length = len(self.data_store)
        self.data_store[:] = [item for item in self.data_store if item["id"] != entity_id]
        return len(self.data_store) < original_length
    
    def count(self) -> int:
        """Count total entities"""
        return len(self.data_store) 