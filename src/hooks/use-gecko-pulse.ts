import { useState, useEffect } from 'react';

export function useGeckoPulse(tenants: any[]) {
  const [metrics, setMetrics] = useState({
    activeUsers: 0,
    gtv: 0,
    systemLoad: 12,
  });

  const [liveFeed, setLiveFeed] = useState<string[]>([]);

  useEffect(() => {
    if (tenants.length === 0) return;

    // 1. Calculate Real-ish Metrics based on Node Count
    const interval = setInterval(() => {
      // Approx 4-8 staff per restaurant
      const estStaff = tenants.length * 6 + Math.floor(Math.random() * 3); 
      // Approx 15k - 25k daily revenue per restaurant (simulated accumulation)
      const estGtv = tenants.length * 25000 + Math.floor(Math.random() * 5000); 
      
      setMetrics({
        activeUsers: estStaff,
        gtv: estGtv,
        systemLoad: 20 + Math.floor(Math.random() * 15),
      });
    }, 3000);

    // 2. Generate Feed Events ONLY for Real Tenants
    const feedInterval = setInterval(() => {
      const actions = ["Order Placed", "Bill Printed", "Inventory Sync", "KDS Bump", "Staff Login", "Table Cleared"];
      
      // Pick a random REAL tenant
      const randomTenant = tenants[Math.floor(Math.random() * tenants.length)];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      const eventMessage = `${randomTenant.code}: ${randomAction}`;
      
      setLiveFeed(prev => [eventMessage, ...prev].slice(0, 5));
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(feedInterval);
    };
  }, [tenants]);

  return { metrics, liveFeed };
}