import React from 'react';
import { Attendance, Score, Student } from '../index';

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'primary' | 'success' | 'info' | 'warning' | 'danger';
}

export interface RemindersProps {
  students: Student[];
  attendance: Attendance[];
  scores: Score[];
}

export interface QuickAccessCardProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}
