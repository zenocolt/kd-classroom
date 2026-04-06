import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Assignment, OperationType } from '../types';
import { handleFirestoreError } from '../services/firestoreError';
import {
  createAssignment,
  deleteAssignment,
  GroupSummaryResult,
  initSubmissionsForAssignment,
  RoomReminderResult,
  sendAssignmentGroupSummary,
  sendAssignmentRoomReminder,
  updateAssignment,
  upsertSubmission,
} from '../services/assignmentService';

export interface AssignmentFormData {
  title: string;
  description: string;
  subjectId: string;
  dueDateStr: string; // ISO local datetime string "YYYY-MM-DDTHH:mm"
}

function toTimestamp(dateTimeStr: string): Timestamp {
  const date = new Date(dateTimeStr);
  return Timestamp.fromDate(date);
}

export function useAssignmentActions(userId: string) {
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateAssignment = async (
    formData: AssignmentFormData,
    studentIds: string[]
  ): Promise<string | null> => {
    setIsSaving(true);
    try {
      const assignmentRef = await (async () => {
        let savedId = '';
        // createAssignment resolves after the document is created; we need the
        // ID to initialise submissions, so we use addDoc directly via the service
        // and capture the returned reference.
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const ref = await addDoc(collection(db, 'assignments'), {
          title: formData.title,
          description: formData.description,
          subjectId: formData.subjectId,
          teacherId: userId,
          due_date: toTimestamp(formData.dueDateStr),
          createdAt: serverTimestamp(),
        });
        savedId = ref.id;
        return savedId;
      })();

      // Bulk-init submission records so the reminder function can query them
      if (studentIds.length > 0) {
        await initSubmissionsForAssignment(assignmentRef, studentIds, userId);
      }

      return assignmentRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignments');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAssignment = async (
    assignmentId: string,
    formData: Partial<AssignmentFormData>
  ) => {
    setIsSaving(true);
    try {
      await updateAssignment(assignmentId, {
        ...(formData.title !== undefined && { title: formData.title }),
        ...(formData.description !== undefined && { description: formData.description }),
        ...(formData.subjectId !== undefined && { subjectId: formData.subjectId }),
        ...(formData.dueDateStr !== undefined && { due_date: toTimestamp(formData.dueDateStr) }),
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'assignments');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    setIsSaving(true);
    try {
      await deleteAssignment(assignment.id);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'assignments');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSubmission = async (
    existingSubmissionId: string | null,
    assignmentId: string,
    studentId: string,
    newStatus: 'submitted' | 'not_submitted'
  ) => {
    try {
      await upsertSubmission(existingSubmissionId, {
        assignmentId,
        studentId,
        status: newStatus,
        teacherId: userId,
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'submissions');
      return false;
    }
  };

  const handleSendRoomReminder = async (
    assignmentId: string,
    studentDocIds: string[]
  ): Promise<RoomReminderResult | null> => {
    setIsSaving(true);
    try {
      const result = await sendAssignmentRoomReminder(assignmentId, studentDocIds);
      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sendAssignmentRoomReminder');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendGroupSummary = async (
    assignmentId: string
  ): Promise<GroupSummaryResult | null> => {
    setIsSaving(true);
    try {
      const result = await sendAssignmentGroupSummary(assignmentId);
      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sendAssignmentGroupSummary');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    handleCreateAssignment,
    handleUpdateAssignment,
    handleDeleteAssignment,
    handleToggleSubmission,
    handleSendRoomReminder,
    handleSendGroupSummary,
  };
}
