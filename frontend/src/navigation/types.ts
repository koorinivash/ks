import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Dashboard: undefined;
  People: undefined;
  Monthly: undefined;
  Reports: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  AddPerson: { personId?: string } | undefined;
  PersonDetails: { personId: string };
  AddMoney: { personId?: string; month?: number; year?: number; recordId?: string } | undefined;
};
