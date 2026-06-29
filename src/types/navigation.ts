// src/types/navigation.ts
import { Child } from './index';

export type RootStackParamList = {
  Home: undefined;
  AddChild: undefined;
  ChildDashboard: { child: Child };
  GrowthChart: { child: Child };
  Immunization: { child: Child };
  Milestone: { child: Child };
  MChat: { child: Child };
  PDFReport: { child: Child };
  Subscription: undefined;
};
