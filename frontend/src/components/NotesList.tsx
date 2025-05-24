import React, { useEffect, useState } from "react";
import { logEvent } from "../services/analyticsLogger";
import "./NotesList.css";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: number;
}

interface NotesListProps {
  userId: string;
  sessionId: string;
}

export const NotesList: React.FC<NotesListProps> = ({ userId, sessionId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const fetchNotes = async () => {
    const res = await fetch(
      `http://localhost:8000/api/notes`,
      {
        credentials: "include",
        headers: { "x-user-id": userId }
      }
    );
    const data = await res.json();
    setNotes(data);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleTypeTitle = (value: string) => {
    setTitle(value);
    logEvent(sessionId, "type", { field: "note-title", value });
  };

  const handleTypeContent = (value: string) => {
    setContent(value);
    logEvent(sessionId, "type", { field: "note-content", value });
  };

  const createNote = async () => {
    logEvent(sessionId, "click", {
      target: "create-note-btn",
      noteTitle: title,
    });
    const res = await fetch(
      `http://localhost:8000/api/notes`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ title, content }),
      }
    );
    if (res.ok) {
      setTitle("");
      setContent("");
      fetchNotes();
    } else {
      alert("Failed to create note");
    }
  };

  const deleteNote = async (noteId: string) => {
    logEvent(sessionId, "click", { target: "delete-note-btn", noteId });
    const res = await fetch(
      `http://localhost:8000/api/notes/${noteId}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: { "x-user-id": userId },
      }
    );
    if (res.ok) {
      fetchNotes();
    } else {
      alert("Failed to delete note");
    }
  };

  return (
    <div className="notes-list-container">
      <h2 className="notes-list-title">Your Notes</h2>
      <ul data-testid="notes-list" className="notes-list">
        {notes.map((n) => (
          <li key={n.id} className="note-item">
            <strong className="note-item-title">{n.title}</strong>
            <p className="note-item-content">{n.content}</p>
            <button
              onClick={() => deleteNote(n.id)}
              className="delete-note-button"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div className="create-note-form-container">
        <h3 className="create-note-form-title">Create New Note</h3>
        <input
          data-testid="note-title-input"
          placeholder="Title"
          value={title}
          onChange={(e) => handleTypeTitle(e.target.value)}
          className="create-note-input"
        />
        <textarea
          data-testid="note-content-input"
          placeholder="Content"
          value={content}
          onChange={(e) => handleTypeContent(e.target.value)}
          className="create-note-textarea"
        />
        <button
          data-testid="create-note-btn"
          onClick={createNote}
          className="create-note-button"
        >
          Create Note
        </button>
      </div>
    </div>
  );
};