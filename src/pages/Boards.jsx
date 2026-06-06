import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Trello, Plus, Home, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Boards() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBoard, setNewBoard] = useState({
    name: '',
    description: '',
    background_color: '#1e3a5f'
  });
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      await loadBoards(currentUser);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadBoards = async (currentUser) => {
    try {
      const allBoards = await base44.entities.Board.filter({ is_active: true });
      // Show public boards and user's own boards
      const filteredBoards = allBoards.filter(
        board => board.is_public || board.created_by === currentUser?.email
      );
      setBoards(filteredBoards.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Error loading boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoard.name.trim()) return;

    try {
      const board = await base44.entities.Board.create({
        ...newBoard,
        is_active: true,
        is_public: false
      });
      
      setBoards([board, ...boards]);
      setShowCreateDialog(false);
      setNewBoard({ name: '', description: '', background_color: '#1e3a5f' });
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  const handleDeleteBoard = async (boardId) => {
    if (!confirm('Deseja realmente excluir este quadro? Esta ação não pode ser desfeita.')) return;

    try {
      await base44.entities.Board.delete(boardId);
      setBoards(boards.filter(b => b.id !== boardId));
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Erro ao excluir quadro');
    }
  };

  const totalPages = Math.ceil(boards.length / ITEMS_PER_PAGE);
  const paginatedBoards = boards.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#d4a853]/20 rounded-full mb-4">
              <Trello className="w-4 h-4" />
              <span className="text-sm font-medium">Quadros de Tarefas</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Organize suas Tarefas
            </h1>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto">
              Gerencie projetos e atividades de forma visual e colaborativa
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Create Button */}
        {user && (
          <div className="mb-6 flex justify-between items-center">
            <Link to={createPageUrl('StudentDashboard')}>
              <Button variant="outline" className="border-[#1e3a5f] text-[#1e3a5f]">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Quadro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Quadro</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Nome do Quadro *</Label>
                    <Input
                      id="name"
                      value={newBoard.name}
                      onChange={(e) => setNewBoard({ ...newBoard, name: e.target.value })}
                      placeholder="Meu Quadro de Tarefas"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={newBoard.description}
                      onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                      placeholder="Organizar minhas atividades"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Cor de Fundo</Label>
                    <div className="flex gap-2">
                      {['#1e3a5f', '#059669', '#7c3aed', '#dc2626', '#ea580c', '#0891b2'].map(color => (
                        <button
                          key={color}
                          onClick={() => setNewBoard({ ...newBoard, background_color: color })}
                          className={`w-10 h-10 rounded-lg ${
                            newBoard.background_color === color ? 'ring-2 ring-offset-2 ring-slate-800' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateBoard} className="w-full bg-[#1e3a5f]">
                    Criar Quadro
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {boards.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Trello className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhum quadro público disponível.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedBoards.map((board, index) => (
                <motion.div
                  key={board.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 6) * 0.05 }}
                >
                <div className="h-full">
                   <Card className="h-full hover:shadow-xl transition-all duration-300 group">
                     <Link to={createPageUrl('BoardView') + `?id=${board.id}`} className="block">
                       <div 
                         className="h-32 rounded-t-xl flex items-center justify-center cursor-pointer"
                         style={{ backgroundColor: board.background_color || '#1e3a5f' }}
                       >
                         <Trello className="w-12 h-12 text-white/50 group-hover:scale-110 transition-transform" />
                       </div>
                     </Link>
                     <CardHeader className="pb-3">
                       <div className="flex items-start justify-between gap-2">
                         <div className="flex-1">
                           <Link to={createPageUrl('BoardView') + `?id=${board.id}`}>
                             <CardTitle className="text-lg group-hover:text-[#1e3a5f] transition-colors cursor-pointer">
                               {board.name}
                             </CardTitle>
                           </Link>
                         </div>
                         {board.created_by === user?.email && (
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                               <Button variant="ghost" size="icon" className="h-6 w-6">
                                 <Trash2 className="w-4 h-4 text-red-600" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                               <DropdownMenuItem 
                                 onClick={() => handleDeleteBoard(board.id)}
                                 className="text-red-600"
                               >
                                 Excluir Quadro
                               </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                         )}
                       </div>
                     </CardHeader>
                     <CardContent>
                       {board.description && (
                         <p className="text-sm text-slate-600 line-clamp-2">{board.description}</p>
                       )}
                     </CardContent>
                   </Card>
                 </div>
              </motion.div>
              ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
               <Button
                 variant="outline"
                 onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                 disabled={currentPage === 0}
               >
                 Anterior
               </Button>
               <div className="flex gap-1">
                 {Array.from({ length: totalPages }, (_, i) => (
                   <Button
                     key={i}
                     variant={currentPage === i ? "default" : "outline"}
                     onClick={() => setCurrentPage(i)}
                     className={currentPage === i ? "bg-[#1e3a5f]" : ""}
                     size="sm"
                   >
                     {i + 1}
                   </Button>
                 ))}
               </div>
               <Button
                 variant="outline"
                 onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                 disabled={currentPage === totalPages - 1}
               >
                 Próxima
               </Button>
              </div>
              )}
              </>
              )}
              </div>
              </div>
              );
              }