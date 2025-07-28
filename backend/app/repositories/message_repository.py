from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from app.models.message_models import ConversationType


class MessageRepository:
    def __init__(self):
        self.conversations = []
        self.messages = []
        self.conversation_participants = []  # Track participants in conversations
        self.read_status = []  # Track read status per user per message
        
    def generate_id(self) -> str:
        """Generate a unique ID"""
        return str(uuid.uuid4())
        
    def create_conversation(
        self,
        conversation_type: ConversationType,
        name: Optional[str] = None,
        team_id: Optional[str] = None,
        participant_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Create a new conversation"""
        conversation_id = self.generate_id()
        conversation = {
            "id": conversation_id,
            "type": conversation_type,
            "name": name,
            "team_id": team_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "last_message_at": None
        }
        self.conversations.append(conversation)
        
        # Add participants
        if participant_ids:
            for user_id in participant_ids:
                self.conversation_participants.append({
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "joined_at": datetime.utcnow().isoformat()
                })
        
        return conversation
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get a conversation by ID"""
        return next((c for c in self.conversations if c["id"] == conversation_id), None)
    
    def get_user_conversations(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a user"""
        # Get conversation IDs where user is a participant
        user_conversation_ids = [
            p["conversation_id"] for p in self.conversation_participants
            if p["user_id"] == user_id
        ]
        
        # Get all team conversations for user's teams
        from app.data_manager import data_manager
        user = data_manager.user_service.get_user(user_id)
        if user:
            team_conversations = [
                c for c in self.conversations 
                if c["type"] == ConversationType.TEAM and c["team_id"] in user.get("team_ids", [])
            ]
            team_conversation_ids = [c["id"] for c in team_conversations]
            user_conversation_ids.extend(team_conversation_ids)
        
        # Remove duplicates and get conversations
        user_conversation_ids = list(set(user_conversation_ids))
        conversations = [c for c in self.conversations if c["id"] in user_conversation_ids]
        
        # Sort by last message timestamp
        return sorted(
            conversations,
            key=lambda x: x.get("last_message_at") or x["created_at"],
            reverse=True
        )
    
    def get_private_conversation(self, user_id1: str, user_id2: str) -> Optional[Dict[str, Any]]:
        """Get existing private conversation between two users"""
        for conversation in self.conversations:
            if conversation["type"] == ConversationType.PRIVATE:
                participants = [
                    p["user_id"] for p in self.conversation_participants
                    if p["conversation_id"] == conversation["id"]
                ]
                if set(participants) == {user_id1, user_id2}:
                    return conversation
        return None
    
    def get_team_conversation(self, team_id: str) -> Optional[Dict[str, Any]]:
        """Get team conversation for a specific team"""
        return next(
            (c for c in self.conversations 
             if c["type"] == ConversationType.TEAM and c["team_id"] == team_id),
            None
        )
    
    def create_message(
        self,
        conversation_id: str,
        sender_id: str,
        content: str
    ) -> Dict[str, Any]:
        """Create a new message"""
        message_id = self.generate_id()
        message = {
            "id": message_id,
            "conversation_id": conversation_id,
            "sender_id": sender_id,
            "content": content,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "is_deleted": False
        }
        self.messages.append(message)
        
        # Update conversation's last message timestamp
        conversation = self.get_conversation(conversation_id)
        if conversation:
            conversation["last_message_at"] = message["created_at"]
            conversation["updated_at"] = message["created_at"]
        
        # Mark as read for sender
        self.mark_message_read(message_id, sender_id)
        
        return message
    
    def get_conversation_messages(
        self,
        conversation_id: str,
        limit: int = 50,
        before: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get messages for a conversation with pagination"""
        messages = [m for m in self.messages if m["conversation_id"] == conversation_id and not m["is_deleted"]]
        
        # Sort by creation time (newest first)
        messages.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Apply pagination
        if before:
            messages = [m for m in messages if m["created_at"] < before]
        
        # Limit results
        messages = messages[:limit]
        
        # Reverse to get chronological order (oldest first)
        return list(reversed(messages))
    
    def update_message(self, message_id: str, content: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update a message"""
        message = next((m for m in self.messages if m["id"] == message_id), None)
        if message:
            if content is not None:
                message["content"] = content
            message["updated_at"] = datetime.utcnow().isoformat()
        return message
    
    def delete_message(self, message_id: str) -> bool:
        """Soft delete a message"""
        message = next((m for m in self.messages if m["id"] == message_id), None)
        if message:
            message["is_deleted"] = True
            message["updated_at"] = datetime.utcnow().isoformat()
            return True
        return False
    
    def mark_message_read(self, message_id: str, user_id: str) -> None:
        """Mark a message as read by a user"""
        # Check if already marked as read
        existing = next(
            (r for r in self.read_status 
             if r["message_id"] == message_id and r["user_id"] == user_id),
            None
        )
        
        if not existing:
            self.read_status.append({
                "message_id": message_id,
                "user_id": user_id,
                "read_at": datetime.utcnow().isoformat()
            })
    
    def mark_conversation_read(self, conversation_id: str, user_id: str) -> None:
        """Mark all messages in a conversation as read by a user"""
        messages = [m for m in self.messages if m["conversation_id"] == conversation_id]
        for message in messages:
            self.mark_message_read(message["id"], user_id)
    
    def get_unread_count(self, conversation_id: str, user_id: str) -> int:
        """Get count of unread messages in a conversation for a user"""
        messages = [m for m in self.messages if m["conversation_id"] == conversation_id and not m["is_deleted"]]
        read_message_ids = [
            r["message_id"] for r in self.read_status 
            if r["user_id"] == user_id
        ]
        
        unread_count = 0
        for message in messages:
            if message["id"] not in read_message_ids and message["sender_id"] != user_id:
                unread_count += 1
        
        return unread_count
    
    def get_conversation_participants(self, conversation_id: str) -> List[str]:
        """Get all participants in a conversation"""
        return [
            p["user_id"] for p in self.conversation_participants
            if p["conversation_id"] == conversation_id
        ]
    
    def add_participant(self, conversation_id: str, user_id: str) -> bool:
        """Add a participant to a conversation"""
        # Check if already a participant
        existing = next(
            (p for p in self.conversation_participants 
             if p["conversation_id"] == conversation_id and p["user_id"] == user_id),
            None
        )
        
        if not existing:
            self.conversation_participants.append({
                "conversation_id": conversation_id,
                "user_id": user_id,
                "joined_at": datetime.utcnow().isoformat()
            })
            return True
        return False
    
    def remove_participant(self, conversation_id: str, user_id: str) -> bool:
        """Remove a participant from a conversation"""
        original_count = len(self.conversation_participants)
        self.conversation_participants = [
            p for p in self.conversation_participants
            if not (p["conversation_id"] == conversation_id and p["user_id"] == user_id)
        ]
        return len(self.conversation_participants) < original_count
    
    def search_messages(self, user_id: str, query: str) -> List[Dict[str, Any]]:
        """Search messages accessible to a user"""
        # Get user's conversations
        user_conversations = self.get_user_conversations(user_id)
        user_conversation_ids = [c["id"] for c in user_conversations]
        
        # Search messages in user's conversations
        results = []
        query_lower = query.lower()
        
        for message in self.messages:
            if (message["conversation_id"] in user_conversation_ids and 
                not message["is_deleted"] and
                query_lower in message["content"].lower()):
                results.append(message)
        
        # Sort by relevance (most recent first)
        results.sort(key=lambda x: x["created_at"], reverse=True)
        return results[:50]  # Limit to 50 results