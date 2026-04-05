import { useState } from 'react';
import { OperationType, Subject } from '../types';
import { handleFirestoreError } from '../services/firestoreError';
import { createSubject, deleteSubject, migrateSubjectRooms, updateSubject } from '../services/subjectService';

interface SubjectFormData {
  code: string;
  name: string;
  level: string;
  room: string;
  department: string;
}

export function useSubjectActions(userId: string) {
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateSubject = async (formData: SubjectFormData) => {
    setIsSaving(true);
    try {
      await createSubject({ ...formData, teacherId: userId });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'subjects');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSubject = async (subjectId: string, formData: SubjectFormData) => {
    setIsSaving(true);
    try {
      await updateSubject(subjectId, formData);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'subjects');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubject = async (subject: Subject) => {
    setIsSaving(true);
    try {
      await deleteSubject(subject.id);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'subjects');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleMigrateSubjectRooms = async (subjectIds: string[], room: string) => {
    setIsSaving(true);
    try {
      await migrateSubjectRooms(subjectIds, room);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'subjects');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    handleCreateSubject,
    handleUpdateSubject,
    handleDeleteSubject,
    handleMigrateSubjectRooms,
  };
}
