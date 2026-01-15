// Supabase Edge Function: create-staff-account
// Tạo tài khoản nhân viên với email ảo (username@qswings.app)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        console.log("Function started");

        // Safety check for environment variables
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

        if (!supabaseUrl || !supabaseServiceKey || !anonKey) {
            console.error("Missing environment variables", { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey, anonKey: !!anonKey });
            return new Response(
                JSON.stringify({ error: "Server misconfiguration: Missing environment variables" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Tạo admin client với service role key
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Tạo client thông thường để verify người gọi
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            console.error("Missing Authorization header");
            return new Response(
                JSON.stringify({ error: "Missing Authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        // Lấy thông tin user đang gọi
        const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !caller) {
            console.error("User validation failed", userError);
            return new Response(
                JSON.stringify({
                    error: "Unauthorized",
                    details: userError?.message || "User not found"
                }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log("Caller verified:", caller.id);

        // Kiểm tra role của người gọi (phải là owner)
        const { data: callerProfile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", caller.id)
            .single();

        if (profileError || !callerProfile) {
            console.error("Profile check failed", profileError);
            return new Response(
                JSON.stringify({ error: "Profile not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (callerProfile.role !== "owner") {
            console.error("Permission denied: Role is " + callerProfile.role);
            return new Response(
                JSON.stringify({ error: "Only owners can create staff accounts" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error("Failed to parse JSON body", e);
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { username, password } = body;

        console.log("Creating staff:", username);

        if (!username || !password) {
            return new Response(
                JSON.stringify({ error: "Username and password are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate username
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return new Response(
                JSON.stringify({ error: "Username must be 3-20 characters, only letters, numbers, and underscores" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (password.length < 6) {
            return new Response(
                JSON.stringify({ error: "Password must be at least 6 characters" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const virtualEmail = `${username}@qswings.app`;

        // Check max staff
        const { data: existingStaff, error: countError } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("parent_id", caller.id)
            .eq("role", "staff");

        if (countError) {
            console.error("Count check failed", countError);
            return new Response(
                JSON.stringify({ error: "Error checking staff count", details: countError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (existingStaff && existingStaff.length >= 3) {
            return new Response(
                JSON.stringify({ error: "Bạn chỉ có thể tạo tối đa 3 tài khoản nhân viên" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check existing username
        const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("username", username)
            .single();

        if (existingProfile) {
            return new Response(
                JSON.stringify({ error: "Tên đăng nhập đã tồn tại" }),
                { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create user
        console.log("Creating Auth user...");
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: virtualEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
                username: username,
                role: "staff",
                full_name: username,
            },
        });

        if (createError) {
            console.error("Create User failed", createError);

            // Handle duplicate email error
            if (createError.message?.includes("already been registered")) {
                return new Response(
                    JSON.stringify({ error: "Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác." }),
                    { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({ error: createError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log("User created, ID:", newUser.user.id);

        // Wait for trigger
        await new Promise(resolve => setTimeout(resolve, 500));

        // Upsert profile
        console.log("Upserting profile...");
        const { error: upsertError } = await supabaseAdmin
            .from("profiles")
            .upsert({
                id: newUser.user.id,
                email: virtualEmail,
                username: username,
                role: "staff",
                parent_id: caller.id,
                // Add is_active conditionally if safe, but upsert is redundant if trigger worked
                // Let's just update parent_id and role to be safe
                created_at: new Date().toISOString()
            }, { onConflict: 'id' });

        // Separate update for critical fields just in case upsert failed on conflict or trigger race condition
        const { error: finalUpdateError } = await supabaseAdmin
            .from("profiles")
            .update({
                role: "staff",
                parent_id: caller.id
            })
            .eq("id", newUser.user.id);

        if (upsertError && finalUpdateError) {
            console.error("Profile setup failed", upsertError || finalUpdateError);
            // Rollback
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
            return new Response(
                JSON.stringify({ error: "Failed to setup profile: " + (upsertError?.message || finalUpdateError?.message) }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log("Success!");
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
        console.error("Global catch", error);
        return new Response(
            JSON.stringify({ error: error.message || "Internal Server Error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
