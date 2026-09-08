import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '등록코드',
          tabBarLabel: '등록코드',
        }}
      />
      <Tabs.Screen
        name="otp"
        options={{
          title: '전화 OTP',
          tabBarLabel: '전화 OTP',
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: '상태',
          tabBarLabel: '상태',
        }}
      />
    </Tabs>
  );
}
