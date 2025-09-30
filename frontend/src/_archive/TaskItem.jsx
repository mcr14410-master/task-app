import React from "react";

export default function TaskItem({ task }) {
  return (
    <div className="bg-white rounded-md shadow p-2 cursor-pointer hover:shadow-lg transition">
      <h3 className="font-semibold text-sm">{task.title}</h3>

      {task.description && (
        <p className="text-xs text-gray-600 mt-1">{task.description}</p>
      )}

      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
        <span>#{task.id}</span>
        {task.dueDate && (
          <span>
            {new Date(task.dueDate).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
