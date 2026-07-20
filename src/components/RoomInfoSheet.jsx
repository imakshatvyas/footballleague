import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import "./RoomInfoSheet.css";

function getRoomName(room) {
  return room?.roomName || room?.name || "Football Talks Room";
}

function getRoomCode(room) {
  return room?.roomCode || room?.code || room?.id || "";
}

function formatDate(value) {
  if (!value) return "-";

  const date = value?.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCreatorName(room, members) {
  const creatorId = room?.createdBy;
  const creator = members.find((member) => member.uid === creatorId || member.userId === creatorId);

  return room?.createdByName || creator?.displayName || creator?.name || "Unknown";
}

async function copyText(text, successMessage) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  toast.success(successMessage);
}

export default function RoomInfoSheet({
  open,
  room,
  members = [],
  onClose,
  onLeaveRoom,
}) {
  const sheetRef = useRef(null);
  const startYRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const roomName = getRoomName(room);
  const roomCode = getRoomCode(room);
  const memberCount = members.length || room?.members?.length || 0;
  const creatorName = getCreatorName(room, members);
  const createdDate = formatDate(room?.createdAt);

  const inviteLink = useMemo(() => {
    if (!roomCode) return "";

    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://footballtalks.netlify.app";

    return `${origin}/join/${roomCode}`;
  }, [roomCode]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("sheet-open");

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("sheet-open");
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleShare = async () => {
    const text = `Football Talks room\n\nRoom: ${roomName}\n\nRoom Code: ${roomCode}\n\n${inviteLink}`;

    if (navigator.share) {
      await navigator.share({
        title: `Join ${roomName}`,
        text,
        url: inviteLink,
      });
      return;
    }

    await copyText(inviteLink, "Invite link copied!");
  };

  const handlePointerDown = (event) => {
    startYRef.current = event.clientY;
    setDragY(0);
    sheetRef.current?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (startYRef.current === null) return;
    setDragY(Math.max(0, event.clientY - startYRef.current));
  };

  const handlePointerUp = () => {
    if (dragY > 80) {
      onClose();
    }

    startYRef.current = null;
    setDragY(0);
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await onLeaveRoom();
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="room-sheet-layer" role="presentation">
      <button className="room-sheet-scrim" type="button" aria-label="Close room information" onClick={onClose} />

      <section
        ref={sheetRef}
        className="room-info-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-info-title"
        style={{ transform: `translateY(${dragY}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="room-sheet-handle" />

        <header className="room-sheet-header">
          <div>
            <p className="room-sheet-eyebrow">Room Information</p>
            <h2 id="room-info-title">{roomName}</h2>
          </div>
          <button className="room-sheet-close" type="button" onClick={onClose} aria-label="Close">
            x
          </button>
        </header>

        <div className="room-sheet-section">
          <p className="room-sheet-label">Room Code</p>
          <div className="room-sheet-code">{roomCode || "-"}</div>
          <button className="room-sheet-action" type="button" onClick={() => copyText(roomCode, "Room code copied!")}>
            Copy Code
          </button>
        </div>

        <div className="room-sheet-section">
          <p className="room-sheet-label">Invite Link</p>
          <div className="room-sheet-link">{inviteLink || "-"}</div>
          <button className="room-sheet-action" type="button" onClick={handleShare}>
            Share Invite
          </button>
        </div>

        <div className="room-sheet-grid">
          <div className="room-sheet-stat">
            <span>Members</span>
            <strong>{memberCount}</strong>
          </div>
          <div className="room-sheet-stat">
            <span>Created By</span>
            <strong>{creatorName}</strong>
          </div>
          <div className="room-sheet-stat">
            <span>Created</span>
            <strong>{createdDate}</strong>
          </div>
        </div>

        <div className="room-sheet-future-actions" aria-hidden="true">
          <span>Edit Room</span>
          <span>Room Settings</span>
        </div>

        <button className="room-sheet-leave" type="button" onClick={() => setConfirmingLeave(true)}>
          Leave Room
        </button>
      </section>

      {confirmingLeave && (
        <div className="leave-confirmation-layer" role="presentation">
          <button
            className="leave-confirmation-layer__scrim"
            type="button"
            aria-label="Cancel leaving room"
            disabled={leaving}
            onClick={() => setConfirmingLeave(false)}
          />
          <section className="leave-confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="leave-confirmation-title">
            <div className="leave-confirmation-dialog__icon" aria-hidden="true">!</div>
            <h3 id="leave-confirmation-title">Leave this room?</h3>
            <p>You will lose access to this room and it will be removed from your room list. Your member record will be labelled “(Left)”.</p>
            <div className="leave-confirmation-dialog__actions">
              <button type="button" onClick={() => setConfirmingLeave(false)} disabled={leaving}>Cancel</button>
              <button type="button" onClick={handleLeave} disabled={leaving}>{leaving ? 'Leaving…' : 'Leave room'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
