import { useState } from 'react';
import { buildReviewTarget } from '@reviewflow/client/reviewUrl';
import TaskDetailModal from './TaskDetailModal.jsx';

const COLUMNS = [
  { id: 'TODO', title: 'Teendő' },
  { id: 'IN_PROGRESS', title: 'Folyamatban' },
  { id: 'ON_HOLD', title: 'Várakozik' },
  { id: 'DONE', title: 'Kész' },
];

export default function KanbanBoard({
  client,
  round,
  tasks = [],
  onTasksUpdated,
  onSessionExpired,
}) {
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [openingTaskId, setOpeningTaskId] = useState(null);
  const [errorNotice, setErrorNotice] = useState('');

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const moveTask = async (taskId, targetStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    const previousStatus = task.status;
    // Optimistic update
    const nextTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status: targetStatus } : t
    );
    onTasksUpdated(nextTasks);
    setErrorNotice('');

    try {
      const { data } = await client.updateTask(taskId, { status: targetStatus });
      onTasksUpdated((current) =>
        current.map((t) => (t.id === taskId ? data.task : t))
      );
    } catch (err) {
      // Rollback on failure
      onTasksUpdated((current) =>
        current.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t))
      );
      if (err.response?.status === 401) {
        onSessionExpired();
        return;
      }
      setErrorNotice('A feladat állapotát nem sikerült menteni. Visszaállítva.');
    }
  };

  const handleOpenOnWebsite = async (task, event) => {
    event.stopPropagation();
    setOpeningTaskId(task.id);
    setErrorNotice('');
    try {
      const { data } = await client.createPreview(round.id);
      const url = buildReviewTarget(round.targetUrl, data.preview.token, {
        pathname: task.comment?.pathname || '/',
        focusCommentId: task.comment?.id,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (err.response?.status === 401) {
        onSessionExpired();
        return;
      }
      setErrorNotice('Nem sikerült megnyitni a céloldalt.');
    } finally {
      setOpeningTaskId(null);
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e, columnId) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    if (taskId) {
      moveTask(taskId, columnId);
    }
  };

  return (
    <div>
      {errorNotice && <p role="alert" className="dev-error dev-card" style={{ marginBottom: '16px' }}>{errorNotice}</p>}

      <div className="dev-kanban-board">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);
          const isOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className={`dev-kanban-column ${isOver ? 'is-drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={(e) => handleDragLeave(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="dev-kanban-col-header">
                <h3>{column.title}</h3>
                <span className="dev-kanban-col-count">{columnTasks.length}</span>
              </div>

              <div className="dev-kanban-list">
                {columnTasks.map((task, idx) => {
                  const comment = task.comment;
                  const isDragging = draggingTaskId === task.id;
                  const repliesCount = comment?.replies?.length || 0;

                  return (
                    <div
                      key={task.id}
                      className={`dev-kanban-card ${isDragging ? 'is-dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="dev-kanban-card-top">
                        <span className="dev-card-number">#{idx + 1}</span>
                        <span className={`dev-status-badge status-${task.status}`}>
                          {column.title}
                        </span>
                      </div>

                      <h4 className="dev-card-title">{task.title}</h4>

                      <div className="dev-card-meta">
                        <div className="dev-card-page">
                          <code>{comment?.pathname || '/'}</code>
                        </div>
                        {comment?.elementText ? (
                          <div className="dev-card-target" title={comment.elementText}>
                            „{comment.elementText.length > 30 ? comment.elementText.slice(0, 30) + '…' : comment.elementText}”
                          </div>
                        ) : comment?.tagName ? (
                          <div className="dev-card-target">&lt;{comment.tagName}&gt;</div>
                        ) : null}
                      </div>

                      <div className="dev-card-footer">
                        <span className="dev-muted dev-small">
                          {repliesCount > 0 ? `${repliesCount} válasz` : 'Nincs válasz'}
                        </span>

                        <div className="dev-card-actions">
                          <button
                            type="button"
                            className="dev-btn-focus"
                            disabled={openingTaskId === task.id}
                            onClick={(e) => handleOpenOnWebsite(task, e)}
                            title="Megnyitás közvetlenül a céloldalon az elem kiemelésével"
                          >
                            {openingTaskId === task.id ? 'Megnyitás…' : 'Oldalon'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {columnTasks.length === 0 && (
                  <p className="dev-muted dev-small" style={{ textAlign: 'center', margin: 'auto 0', padding: '16px 0' }}>
                    Nincs feladat ebben az oszlopban
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          round={round}
          client={client}
          onClose={() => setSelectedTaskId(null)}
          onStatusChange={(taskId, newStatus) => {
            moveTask(taskId, newStatus);
            setSelectedTaskId(null);
          }}
          onCommentUpdated={(updatedComment) => {
            onTasksUpdated((current) =>
              current.map((t) =>
                t.id === selectedTask.id
                  ? { ...t, comment: updatedComment }
                  : t
              )
            );
          }}
          onSessionExpired={onSessionExpired}
        />
      )}
    </div>
  );
}
