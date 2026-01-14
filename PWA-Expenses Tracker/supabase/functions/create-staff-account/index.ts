// Supabase Edge Function: create-staff-account
// Tạo tài khoản nhân viên với email ảo (username@qswings.app)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Lấy Supabase URL và Service Role Key từ environment
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Tạo admin client với service role key
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Tạo client thông thường để verify người gọi
        const authHeader = req.headers.get("Authorization")!;
        const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
            global: { headers: { Authorization: authHeader } },
        });

        // Lấy thông tin user đang gọi
        const {
            data: { user: caller },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !caller) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Kiểm tra role của người gọi (phải là owner)
        const { data: callerProfile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", caller.id)
            .single();

        if (profileError || !callerProfile) {
            return new Response(
                JSON.stringify({ error: "Profile not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (callerProfile.role !== "owner") {
            return new Response(
                JSON.stringify({ error: "Only owners can create staff accounts" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const { username, password } = await req.json();

        if (!username || !password) {
            return new Response(
                JSON.stringify({ error: "Username and password are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate username (chỉ cho phép chữ cái, số, gạch dưới)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return new Response(
                JSON.stringify({ error: "Username must be 3-20 characters, only letters, numbers, and underscores" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate password (tối thiểu 6 ký tự)
        if (password.length < 6) {
            return new Response(
                JSON.stringify({ error: "Password must be at least 6 characters" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Tạo email ảo
        const virtualEmail = `${username}@qswings.app`;

        // Kiểm tra username đã tồn tại chưa
        const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("username", username)
            .single();

        if (existingProfile) {
            return new Response(
                JSON.stringify({ error: "Username already exists" }),
                { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Tạo user mới với Admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: virtualEmail,
            password: password,
            email_confirm: true, // Xác thực email ngay lập tức
            user_metadata: {
                username: username,
                role: "staff",
                full_name: username,
            },
        });

        if (createError) {
            return new Response(
                JSON.stringify({ error: createError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Thêm thông tin vào bảng profiles
        const { error: insertError } = await supabaseAdmin
            .from("profiles")
            .insert({
                id: newUser.user.id,
                username: username,
                email: virtualEmail,
                role: "staff",
                parent_id: caller.id, // Liên kết với owner tạo ra
            });

        if (insertError) {
            // Rollback: xóa user nếu không thể tạo profile
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
            return new Response(
                JSON.stringify({ error: "Failed to create profile: " + insertError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Staff account created successfully",
                staff: {
                    id: newUser.user.id,
                    username: username,
                    email: virtualEmail,
                },
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
