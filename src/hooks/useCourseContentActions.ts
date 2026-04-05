import React, { useState } from 'react';
import { CourseContent, OperationType } from '../types';
import { handleFirestoreError } from '../services/firestoreError';
import {
  createCourseContent,
  updateCourseContent,
  deleteCourseContent,
} from '../services/courseContentService';

export function useCourseContentActions(subjectId: string, userId: string) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingContent, setEditingContent] = useState<CourseContent | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  const openCreate = () => {
    setEditingContent(null);
    setTitle('');
    setDescription('');
    setUrl('');
    setIsAdding(true);
  };

  const openEdit = (item: CourseContent) => {
    setEditingContent(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setUrl(item.url || '');
    setIsAdding(false);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingContent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      if (editingContent) {
        await updateCourseContent(editingContent.id, {
          title: title.trim(),
          description: description.trim(),
          url: url.trim(),
        });
      } else {
        await createCourseContent({
          title: title.trim(),
          description: description.trim(),
          url: url.trim(),
          subjectId,
          teacherId: userId,
        });
      }
      setIsAdding(false);
      setEditingContent(null);
      setTitle('');
      setDescription('');
      setUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'course_content');
    }
  };

  const requestDelete = (id: string) => setIsDeleting(id);
  const cancelDelete = () => setIsDeleting(null);

  const confirmDelete = async () => {
    if (!isDeleting) return;
    try {
      await deleteCourseContent(isDeleting);
      setIsDeleting(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'course_content');
    }
  };

  return {
    isAdding,
    editingContent,
    isDeleting,
    title,
    setTitle,
    description,
    setDescription,
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
