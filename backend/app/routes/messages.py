from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
import logging
from app.models.message_models import MessageIn, ConversationIn, MessageUpdate
from app.routes.dependencies import get_current_user
from app.data_manager import data_manager

# Set up standard Python logging
logger = logging.getLogger(__name__)

router = APIRouter()
message_service = data_manager.message_service


@router.post("/api/conversations", tags=["messages"])
async def create_conversation(
    conversation_data: ConversationIn,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new conversation
    - Private: between 2 users
    - Team: for a team
    """
    try:
        logger.info(f"User {current_user['id']} creating conversation of type {conversation_data.type}")
        conversation = message_service.create_conversation(current_user['id'], conversation_data)
        return conversation
    except ValueError as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to create conversation")


@router.get("/api/conversations", response_model=List[dict], tags=["messages"])
async def get_conversations(
    current_user: dict = Depends(get_current_user)
):
    """Get all conversations for the current user"""
    try:
        logger.info(f"User {current_user['id']} fetching conversations")
        conversations = message_service.get_user_conversations(current_user['id'])
        return conversations
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversations")


@router.post("/api/messages", tags=["messages"])
async def send_message(
    message_data: MessageIn,
    current_user: dict = Depends(get_current_user)
):
    """Send a message in a conversation"""
    try:
        logger.info(f"User {current_user['id']} sending message to conversation {message_data.conversation_id}")
        message = message_service.send_message(current_user['id'], message_data)
        return message
    except ValueError as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error sending message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")


@router.get("/api/conversations/{conversation_id}/messages", response_model=List[dict], tags=["messages"])
async def get_messages(
    conversation_id: str,
    limit: int = Query(50, ge=1, le=100),
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get messages from a conversation with pagination"""
    try:
        logger.info(f"User {current_user['id']} fetching messages from conversation {conversation_id}")
        messages = message_service.get_conversation_messages(
            current_user['id'], conversation_id, limit, before
        )
        return messages
    except ValueError as e:
        logger.error(f"Error fetching messages: {e}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error fetching messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch messages")


@router.put("/api/messages/{message_id}", tags=["messages"])
async def update_message(
    message_id: str,
    update_data: MessageUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a message (only by sender)"""
    try:
        logger.info(f"User {current_user['id']} updating message {message_id}")
        message = message_service.update_message(current_user['id'], message_id, update_data)
        return message
    except ValueError as e:
        logger.error(f"Error updating message: {e}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error updating message: {e}")
        raise HTTPException(status_code=500, detail="Failed to update message")


@router.delete("/api/messages/{message_id}", tags=["messages"])
async def delete_message(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a message (only by sender)"""
    try:
        logger.info(f"User {current_user['id']} deleting message {message_id}")
        success = message_service.delete_message(current_user['id'], message_id)
        if success:
            return {"message": "Message deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Message not found")
    except ValueError as e:
        logger.error(f"Error deleting message: {e}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error deleting message: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete message")


@router.get("/api/messages/search", response_model=List[dict], tags=["messages"])
async def search_messages(
    q: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user)
):
    """Search messages accessible to the user"""
    try:
        logger.info(f"User {current_user['id']} searching messages with query: {q}")
        messages = message_service.search_messages(current_user['id'], q)
        return messages
    except Exception as e:
        logger.error(f"Error searching messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to search messages")


@router.post("/api/conversations/{conversation_id}/read", tags=["messages"])
async def mark_conversation_read(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark all messages in a conversation as read"""
    try:
        logger.info(f"User {current_user['id']} marking conversation {conversation_id} as read")
        message_service.mark_conversation_read(current_user['id'], conversation_id)
        return {"message": "Conversation marked as read"}
    except ValueError as e:
        logger.error(f"Error marking conversation as read: {e}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error marking conversation as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark conversation as read")