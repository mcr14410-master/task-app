import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useTasks } from "@/hooks/useTasks";
import TaskItem from "./TaskItem";
import TaskCreationModal from "./modals/TaskCreationModal";
import TaskEditModal from "./modals/TaskEditModal";

export default function TaskBoard() {
  const { tasks, createTask, updateTask, loading } = useTasks();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);

  if (loading) return <p>Lade Aufgaben...</p>;

  // ---- Tasks nach Station gruppieren ----
  const grouped = tasks.reduce((acc, task) => {
    acc[task.station] = acc[task.station] || [];
    acc[task.station].push(task);
    return acc;
  }, {});

  const stations = Object.keys(grouped);

  // ---- Drag & Drop Handler ----
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const taskId = parseInt(draggableId, 10);
    const movedTask = tasks.find((t) => t.id === taskId);
    if (!movedTask) return;

    await updateTask(taskId, {
      ...movedTask,
      station: destination.droppableId,
    });
  };

  return (
    <>
      {/* Action-Bar oben */}
      <div className="flex justify-between items-center p-4">
        <h1 className="text-xl font-bold">Task Board</h1>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-3 py-1 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
        >
          + Neue Aufgabe
        </button>
      </div>

      {/* Drag & Drop Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto p-4">
          {stations.map((station) => (
            <Droppable droppableId={station} key={station}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="w-64 bg-gray-100 p-2 rounded-md shadow-md flex flex-col"
                >
                  <h2 className="text-lg font-semibold mb-2">{station}</h2>
                  {grouped[station].map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id.toString()}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`mb-2 ${
                            snapshot.isDragging ? "opacity-70" : ""
                          }`}
                          onClick={() => setEditTask(task)} // Klick = Edit öffnen
                        >
                          <TaskItem task={task} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* Modals */}
      <TaskCreationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={createTask}
      />

      <TaskEditModal
        isOpen={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        onSubmit={(updated) => updateTask(updated.id, updated)}
      />
    </>
  );
}
