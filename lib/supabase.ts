import { createClient } from '@supabase/supabase-js';

const supabaseUrl = https://djuaegrszjsbxtamshnw.supabase.co;
const supabaseAnonKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqdWFlZ3JzempzYnh0YW1zaG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NzI2NjgsImV4cCI6MjEwNTE0ODY2OH0.328njzXtVx1tWgx2D0ib9kW_3TP7ug1LQkLNVYW_Xfc;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
