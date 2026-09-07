import { useUserStore } from '../store/userStore.js';
import { useAuthStore } from '../store/authStore.js';

export function useSubscription() {
  const phoneNumber = useAuthStore((state) => state.phoneNumber);
  const users = useUserStore((state) => state.users);
  
  const user = users[phoneNumber];
  
  const hasFeature = (featureKey) => {
    if (!user) return false;
    // Admins always have access, but for farmers, check feature toggle
    if (user.status !== 'APPROVED') return false;
    return Boolean(user.features?.[featureKey]);
  };
  
  return {
    tier: user?.tier || 'Basic',
    hasFeature,
    user
  };
}
