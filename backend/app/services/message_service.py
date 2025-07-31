from typing import List, Optional, Dict, Any
from app.models.message_models import MessageIn, ConversationIn, MessageUpdate, ConversationType
from app.models.notification_models import NotificationType


class MessageService:
    def __init__(self, message_repo=None, user_service=None, team_service=None, notification_service=None):
        # Import here to avoid circular dependencies
        if message_repo is None:
            from app.data_manager import data_manager
            self.message_repo = data_manager.message_repository
            self.user_service = data_manager.user_service
            self.team_service = data_manager.team_service
            self.notification_service = data_manager.notification_service
        else:
            self.message_repo = message_repo
            self.user_service = user_service
            self.team_service = team_service
            self.notification_service = notification_service
    
    def create_conversation(
        self,
        user_id: str,
        conversation_data: ConversationIn
    ) -> Dict[str, Any]:
        """Create a new conversation"""
        # For private conversations
        if conversation_data.type == ConversationType.PRIVATE:
            if not conversation_data.participant_ids or len(conversation_data.participant_ids) != 2:
                raise ValueError("Private conversations must have exactly 2 participants")
            
            # Check if conversation already exists
            user1_id, user2_id = conversation_data.participant_ids
            existing = self.message_repo.get_private_conversation(user1_id, user2_id)
            if existing:
                return existing
            
            # Create private conversation
            conversation = self.message_repo.create_conversation(
                conversation_type=ConversationType.PRIVATE,
                participant_ids=conversation_data.participant_ids
            )
            
            # Set conversation name based on participants
            participants = []
            for participant_id in conversation_data.participant_ids:
                user = self.user_service.get_user(participant_id)
                if user:
                    participants.append(user.get("full_name", user.get("username", "Unknown")))
            
            # Don't set a fixed name for private conversations
            # Frontend will display the other participant's name
            
        # For team conversations
        elif conversation_data.type == ConversationType.TEAM:
            if not conversation_data.team_id:
                raise ValueError("Team conversations must have a team_id")
            
            # Check if team conversation already exists
            existing = self.message_repo.get_team_conversation(conversation_data.team_id)
            if existing:
                return existing
            
            # Get team info
            team = self.team_service.get_team(conversation_data.team_id)
            if not team:
                raise ValueError("Team not found")
            
            # Create team conversation
            conversation = self.message_repo.create_conversation(
                conversation_type=ConversationType.TEAM,
                name=f"{team['name']} Team Chat",
                team_id=conversation_data.team_id
            )
            
            # Add all team members as participants
            team_members = self.team_service.get_team_members(conversation_data.team_id)
            for member in team_members:
                self.message_repo.add_participant(conversation["id"], member["id"])
        
        else:
            raise ValueError("Invalid conversation type")
        
        return conversation
    
    def get_user_conversations(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a user with additional info"""
        conversations = self.message_repo.get_user_conversations(user_id)
        
        # Enhance conversations with additional info
        enhanced_conversations = []
        for conv in conversations:
            enhanced = conv.copy()
            
            # Add participant info for private conversations
            if conv["type"] == ConversationType.PRIVATE:
                participants = self.message_repo.get_conversation_participants(conv["id"])
                other_participant_id = next((p for p in participants if p != user_id), None)
                
                if other_participant_id:
                    other_user = self.user_service.get_user(other_participant_id)
                    if other_user:
                        enhanced["other_participant"] = {
                            "id": other_user["id"],
                            "username": other_user["username"],
                            "full_name": other_user.get("full_name", other_user["username"]),
                            "avatar": other_user.get("avatar")
                        }
            
            # Add team info for team conversations
            elif conv["type"] == ConversationType.TEAM and conv.get("team_id"):
                team = self.team_service.get_team(conv["team_id"])
                if team:
                    enhanced["team"] = {
                        "id": team["id"],
                        "name": team["name"],
                        "icon": team.get("icon")
                    }
            
            # Add unread count
            enhanced["unread_count"] = self.message_repo.get_unread_count(conv["id"], user_id)
            
            # Add last message preview
            messages = self.message_repo.get_conversation_messages(conv["id"], limit=1)
            if messages:
                last_message = messages[0]
                sender = self.user_service.get_user(last_message["sender_id"])
                enhanced["last_message"] = {
                    "content": last_message["content"],
                    "created_at": last_message["created_at"],
                    "sender_name": sender.get("full_name", sender.get("username", "Unknown")) if sender else "Unknown"
                }
            
            enhanced_conversations.append(enhanced)
        
        return enhanced_conversations
    
    def send_message(
        self,
        user_id: str,
        message_data: MessageIn
    ) -> Dict[str, Any]:
        """Send a message in a conversation"""
        # Verify user has access to conversation
        conversation = self.message_repo.get_conversation(message_data.conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")
        
        # Check if user is participant or in team
        if conversation["type"] == ConversationType.PRIVATE:
            participants = self.message_repo.get_conversation_participants(conversation["id"])
            if user_id not in participants:
                raise ValueError("User is not a participant in this conversation")
        elif conversation["type"] == ConversationType.TEAM:
            user = self.user_service.get_user(user_id)
            if not user or conversation["team_id"] not in user.get("team_ids", []):
                raise ValueError("User is not a member of this team")
        
        # Create message
        message = self.message_repo.create_message(
            conversation_id=message_data.conversation_id,
            sender_id=user_id,
            content=message_data.content
        )
        
        # Send notifications to other participants
        if conversation["type"] == ConversationType.PRIVATE:
            participants = self.message_repo.get_conversation_participants(conversation["id"])
            other_participant_id = next((p for p in participants if p != user_id), None)
            
            if other_participant_id:
                sender = self.user_service.get_user(user_id)
                self.notification_service.create_notification(
                    recipient_id=other_participant_id,
                    notification_type=NotificationType.MESSAGE,
                    title="New Message",
                    message=f"{sender.get('full_name', sender.get('username', 'Someone'))} sent you a message"
                )
        
        return message
    
    def get_conversation_messages(
        self,
        user_id: str,
        conversation_id: str,
        limit: int = 50,
        before: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get messages from a conversation"""
        # Verify user has access
        conversation = self.message_repo.get_conversation(conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")
        
        # Check access
        if conversation["type"] == ConversationType.PRIVATE:
            participants = self.message_repo.get_conversation_participants(conversation_id)
            if user_id not in participants:
                raise ValueError("User is not a participant in this conversation")
        elif conversation["type"] == ConversationType.TEAM:
            user = self.user_service.get_user(user_id)
            if not user or conversation["team_id"] not in user.get("team_ids", []):
                raise ValueError("User is not a member of this team")
        
        # Get messages
        messages = self.message_repo.get_conversation_messages(conversation_id, limit, before)
        
        # Enhance messages with sender info
        enhanced_messages = []
        for msg in messages:
            enhanced = msg.copy()
            sender = self.user_service.get_user(msg["sender_id"])
            if sender:
                enhanced["sender"] = {
                    "id": sender["id"],
                    "username": sender["username"],
                    "full_name": sender.get("full_name", sender["username"]),
                    "avatar": sender.get("avatar")
                }
            enhanced_messages.append(enhanced)
        
        # Mark messages as read
        self.message_repo.mark_conversation_read(conversation_id, user_id)
        
        return enhanced_messages
    
    def update_message(
        self,
        user_id: str,
        message_id: str,
        update_data: MessageUpdate
    ) -> Dict[str, Any]:
        """Update a message (only by sender)"""
        # Get message
        message = next(
            (m for m in self.message_repo.messages if m["id"] == message_id),
            None
        )
        
        if not message:
            raise ValueError("Message not found")
        
        # Only sender can update
        if message["sender_id"] != user_id:
            raise ValueError("Only the sender can update this message")
        
        # Update message
        updated = self.message_repo.update_message(
            message_id,
            content=update_data.content
        )
        
        return updated
    
    def delete_message(
        self,
        user_id: str,
        message_id: str
    ) -> bool:
        """Delete a message (only by sender)"""
        # Get message
        message = next(
            (m for m in self.message_repo.messages if m["id"] == message_id),
            None
        )
        
        if not message:
            raise ValueError("Message not found")
        
        # Only sender can delete
        if message["sender_id"] != user_id:
            raise ValueError("Only the sender can delete this message")
        
        # Delete message
        return self.message_repo.delete_message(message_id)
    
    def search_messages(
        self,
        user_id: str,
        query: str
    ) -> List[Dict[str, Any]]:
        """Search messages accessible to user"""
        messages = self.message_repo.search_messages(user_id, query)
        
        # Enhance with sender and conversation info
        enhanced_messages = []
        for msg in messages:
            enhanced = msg.copy()
            
            # Add sender info
            sender = self.user_service.get_user(msg["sender_id"])
            if sender:
                enhanced["sender"] = {
                    "id": sender["id"],
                    "username": sender["username"],
                    "full_name": sender.get("full_name", sender["username"])
                }
            
            # Add conversation info
            conversation = self.message_repo.get_conversation(msg["conversation_id"])
            if conversation:
                enhanced["conversation"] = {
                    "id": conversation["id"],
                    "type": conversation["type"],
                    "name": conversation.get("name")
                }
            
            enhanced_messages.append(enhanced)
        
        return enhanced_messages
    
    def mark_conversation_read(
        self,
        user_id: str,
        conversation_id: str
    ) -> None:
        """Mark all messages in a conversation as read"""
        # Verify access
        conversation = self.message_repo.get_conversation(conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")
        
        # Mark as read
        self.message_repo.mark_conversation_read(conversation_id, user_id)