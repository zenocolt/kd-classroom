import React, { useState } from 'react';
import { Slide, OperationType } from '../types';
import { handleFirestoreError } from '../services/firestoreError';
import { createSlide, updateSlide, deleteSlide } from '../services/slideService';

export function useSlideActions(subjectId: string, userId: string) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const openCreate = () => {
    setEditingSlide(null);
    setTitle('');
    setUrl('');
    setIsAdding(true);
  };

  const openEdit = (slide: Slide) => {
    setEditingSlide(slide);
    setTitle(slide.title);
    setUrl(slide.url);
    setIsAdding(false);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingSlide(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;

    try {
      if (editingSlide) {
        await updateSlide(editingSlide.id, { title: title.trim(), url: url.trim() });
      } else {
        await createSlide({ title: title.trim(), url: url.trim(), subjectId, teacherId: userId });
      }
      setIsAdding(false);
      setEditingSlide(null);
      setTitle('');
      setUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'slides');
    }
  };

  const requestDelete = (id: string) => setIsDeleting(id);
  const cancelDelete = () => setIsDeleting(null);

  const confirmDelete = async () => {
    if (!isDeleting) return;
    try {
      await deleteSlide(isDeleting);
      setIsDeleting(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'slides');
    }
  };

  return {
    isAdding,
    editingSlide,
    isDeleting,
    title,
    setTitle,
    url,
    setUrl,
    openCreate,
    openEdit,
    cancelForm,
    handleSubmit,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
