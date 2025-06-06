from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from .dependencies import get_current_user, log_action

router = APIRouter(prefix="/api", tags=["notifications"])

@router.get("/notifications")
def list_user_notifications(request: Request, unread_only: bool = False, 
                           current_user: dict = Depends(get_current_user)):
    """List notifications for the current user"""
    notifications = data_manager.notification_service.get_user_notifications(current_user["id"], unread_only)
    log_action(request, "NOTIFICATIONS_GET", {
        "text": f"User {current_user['full_name']} viewed notifications",
        "userId": current_user["id"],
        "unreadOnly": unread_only
    })
    return notifications

@router.put("/notifications/{notification_id}/mark_read")
def mark_notification_read(notification_id: str, request: Request, 
                          current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    try:
        # Verify notification exists
        notification = data_manager.notification_repository.find_by_id(notification_id)
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        # Verify notification belongs to current user
        if notification["recipient_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied to this notification")
        
        success = data_manager.notification_service.mark_notification_read(notification_id, current_user["id"])
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        log_action(request, "NOTIFICATION_READ", {
            "text": f"User {current_user['full_name']} marked notification {notification_id} as read",
            "notificationId": notification_id,
            "userId": current_user["id"]
        })
        return {"status": "marked_read"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/notifications/mark_all_read")
def mark_all_notifications_read(request: Request, current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read for the current user"""
    count = data_manager.notification_service.mark_all_notifications_read(current_user["id"])
    log_action(request, "NOTIFICATIONS_MARK_ALL_READ", {
        "text": f"User {current_user['full_name']} marked all notifications as read",
        "userId": current_user["id"],
        "count": count
    })
    return {"status": "all_marked_read", "count": count}

@router.get("/notifications/unread_count")
def get_unread_notification_count(request: Request, current_user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    count = data_manager.notification_service.get_unread_count(current_user["id"])
    log_action(request, "NOTIFICATIONS_UNREAD_COUNT", {
        "text": f"User {current_user['full_name']} viewed unread notification count",
        "userId": current_user["id"],
        "count": count
    })
    return {"unread_count": count} 