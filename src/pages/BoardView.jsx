import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Users, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import BoardColumn from "@/components/board/BoardColumn";
import TaskDialog from "@/components/board/TaskDialog";
import ListDialog from "@/components/board/ListDialog";
import MembersDialog from "@/components/board/MembersDialog";

export default function BoardView() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const boardId = params.get('id');

  const [user, setUser] = useState(null);
  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedListId, setSelectedListId] = useState(null);
  const boardHeaderRef = React.useRef(null);

  useEffect(() => {
    if (!boardId) {
      window.location.replace(createPageUrl('AdminBoards'));
      return;
    }
    loadData();
  }, [boardId]);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        window.location.replace(createPageUrl('Home'));
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const boards = await base44.entities.Board.list();
      const currentBoard = boards.find(b => b.id === boardId);
      
      if (!currentBoard) {
        window.location.replace(createPageUrl('AdminBoards'));
        return;
      }

      setBoard(currentBoard);
      await loadListsAndTasks();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadListsAndTasks = async () => {
    const boardLists = await base44.entities.BoardList.filter({ board_id: boardId });
    const sortedLists = boardLists.sort((a, b) => (a.order || 0) - (b.order || 0));
    setLists(sortedLists);

    const allTasks = [];
    for (const list of sortedLists) {
      const listTasks = await base44.entities.BoardTask.filter({ list_id: list.id });
      allTasks.push(...listTasks);
    }
    setTasks(allTasks);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'list') {
      const newLists = Array.from(lists);
      const [removed] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, removed);
      
      setLists(newLists);
      
      for (let i = 0; i < newLists.length; i++) {
        await base44.entities.BoardList.update(newLists[i].id, { order: i });
      }
    } else {
      const newTasks = Array.from(tasks);
      const taskIndex = newTasks.findIndex(t => t.id === draggableId);
      const task = newTasks[taskIndex];
      
      newTasks.splice(taskIndex, 1);
      
      const updatedTask = {
        ...task,
        list_id: destination.droppableId
      };
      
      setTasks([...newTasks, updatedTask]);
      
      await base44.entities.BoardTask.update(task.id, {
        list_id: destination.droppableId,
        order: destination.index
      });
    }
  };

  const handleOpenTaskDialog = (listId, task = null) => {
    setSelectedListId(listId);
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Deseja realmente excluir esta tarefa?')) return;
    await base44.entities.BoardTask.delete(taskId);
    loadListsAndTasks();
  };

  const handleDeleteList = async (listId) => {
    if (!confirm('Deseja realmente excluir esta lista e todas as suas tarefas?')) return;
    const listTasks = tasks.filter(t => t.list_id === listId);
    for (const task of listTasks) {
      await base44.entities.BoardTask.delete(task.id);
    }
    await base44.entities.BoardList.delete(listId);
    loadListsAndTasks();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">Quadro não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen overflow-hidden"
      style={{ backgroundColor: board.background_color || '#1e3a5f' }}
    >
      <div className="pt-6 px-6">
        <div className="max-w-full">
          <div className="flex items-center justify-between mb-6" ref={boardHeaderRef}>
            <div className="flex items-center gap-4">
              <Link to={user?.role === 'admin' ? createPageUrl('AdminBoards') : createPageUrl('Boards')} className="text-white/80 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              {user?.role !== 'admin' && (
                <Link to={createPageUrl('StudentDashboard')}>
                  <Button variant="outline" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{board.name}</h1>
                {board.description && (
                  <p className="text-white/70 text-sm">{board.description}</p>
                )}
              </div>
            </div>
            {(user?.role === 'admin' || board?.created_by === user?.email) && (
              <div className="flex gap-2">
                <Button onClick={() => setMembersDialogOpen(true)} className="bg-white/20 hover:bg-white/30 text-white border-0">
                  <Users className="w-4 h-4 mr-2" />
                  Membros
                </Button>
                <Button onClick={() => setListDialogOpen(true)} className="bg-white/20 hover:bg-white/30 text-white border-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Lista
                </Button>
              </div>
            )}
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="board" direction="horizontal" type="list">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex gap-4 overflow-x-auto pb-4"
                >
                  {lists.map((list, index) => (
                    <Draggable key={list.id} draggableId={list.id} index={index} isDragDisabled={user?.role !== 'admin' && board?.created_by !== user?.email}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <BoardColumn
                            list={list}
                            tasks={tasks.filter(t => t.list_id === list.id).sort((a, b) => (a.order || 0) - (b.order || 0))}
                            onAddTask={() => handleOpenTaskDialog(list.id)}
                            onEditTask={(task) => handleOpenTaskDialog(list.id, task)}
                            onDeleteTask={handleDeleteTask}
                            onDeleteList={handleDeleteList}
                            isAdmin={user?.role === 'admin' || board?.created_by === user?.email}
                            userEmail={user?.email}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      <TaskDialog
         open={taskDialogOpen}
         onClose={() => {
           setTaskDialogOpen(false);
           setEditingTask(null);
         }}
         listId={selectedListId}
         task={editingTask}
         onSave={loadListsAndTasks}
         boardCreator={board?.created_by}
         userEmail={user?.email}
       />

      <ListDialog
        open={listDialogOpen}
        onClose={() => setListDialogOpen(false)}
        boardId={boardId}
        onSave={loadListsAndTasks}
      />

      <MembersDialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        boardId={boardId}
        onUpdate={loadData}
      />
    </div>
  );
}