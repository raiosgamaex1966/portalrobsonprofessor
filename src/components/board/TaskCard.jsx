import React from 'react';
import { Calendar, User, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TaskCard({ task, onEdit, onDelete, isAdmin, isStudentTask }) {
  const priorityColors = {
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700'
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <Card className="bg-white hover:bg-slate-50 transition-colors cursor-pointer" onClick={onEdit}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-medium text-slate-800 flex-1">{task.title}</h4>
          {(isAdmin || isStudentTask) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-slate-600 mb-2 line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-1 mb-2">
          {task.priority && (
            <Badge className={`text-xs ${priorityColors[task.priority]}`}>
              {task.priority}
            </Badge>
          )}
          {task.labels?.map((label, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {label}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
           {task.due_date && (
             <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
               <Calendar className="w-3 h-3" />
               {format(new Date(task.due_date), 'd MMM', { locale: ptBR })}
             </div>
           )}
           {task.assigned_to && (
             <div className="flex items-center gap-1">
               <User className="w-3 h-3" />
               <span className="truncate max-w-[100px]">{task.assigned_to.split('@')[0]}</span>
             </div>
           )}
           {task.students?.length > 0 && (
             <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
               {task.students.length} aluno(s)
             </div>
           )}
         </div>
      </CardContent>
    </Card>
  );
}