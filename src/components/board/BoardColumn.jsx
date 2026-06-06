import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TaskCard from "./TaskCard";

export default function BoardColumn({ list, tasks, onAddTask, onEditTask, onDeleteTask, onDeleteList, isAdmin, userEmail }) {
  return (
    <div className="w-80 flex-shrink-0">
      <Card className="bg-slate-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{list.name}</CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">{tasks.length}</span>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDeleteList(list.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Lista
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Droppable droppableId={list.id} type="task">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[100px] ${snapshot.isDraggingOver ? 'bg-slate-200/50 rounded-lg' : ''}`}
              >
                {tasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="mb-2"
                      >
                        <TaskCard
                           task={task}
                           onEdit={() => onEditTask(task)}
                           onDelete={() => onDeleteTask(task.id)}
                           isAdmin={isAdmin}
                           isStudentTask={task.students?.includes(userEmail)}
                         />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          
          <Button
            variant="ghost"
            onClick={onAddTask}
            className="w-full justify-start text-slate-600 hover:bg-slate-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar tarefa
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}