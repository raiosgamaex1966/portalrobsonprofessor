import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ListDialog({ open, onClose, boardId, onSave }) {
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const lists = await base44.entities.BoardList.filter({ board_id: boardId });
      await base44.entities.BoardList.create({
        board_id: boardId,
        name: name,
        order: lists.length
      });
      setName('');
      onSave();
      onClose();
    } catch (error) {
      alert('Erro ao criar lista: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Lista</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Nome da Lista *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: A Fazer, Em Progresso, Concluído"
              required
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
              Criar Lista
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}