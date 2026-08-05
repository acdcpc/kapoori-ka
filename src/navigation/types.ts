// src/navigation/types.ts
import { Child } from '../types';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  AddChild: undefined;
  ChildDashboard: { child: Child };
  GrowthChart: { child: Child };
  Immunization: { child: Child };
  Milestone: { child: Child };
  MChat: { child: Child };
  PDFReport: { child: Child };
  Subscription: undefined;
  About: undefined;
  Nutrition: { child?: Child; highlightAge?: number } | undefined;
};
