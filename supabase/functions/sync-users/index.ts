
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔍 Fetching all auth users with admin privileges...')
    
    // Get all users from auth.users table (only possible with service role)
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError)
      throw authError
    }

    console.log(`✅ Found ${authUsers.users.length} auth users:`)
    authUsers.users.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`)
    })

    // Get existing profiles
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      throw profilesError
    }

    const existingProfileIds = new Set(existingProfiles?.map(p => p.id) || [])
    console.log(`📊 Found ${existingProfiles?.length || 0} existing profiles`)

    // Find users missing profiles
    const missingUsers = authUsers.users.filter(user => !existingProfileIds.has(user.id))
    console.log(`⚠️ Found ${missingUsers.length} users missing profiles`)

    // Create profiles for missing users
    const newProfiles = missingUsers.map(user => ({
      id: user.id,
      nickname: user.email?.split('@')[0] || `User_${user.id.substring(0, 8)}`,
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
      age: null,
      gender: null,
      avatar_preset: 'default',
      interests: [],
      location_sharing_enabled: true,
      notifications_enabled: true
    }))

    if (newProfiles.length > 0) {
      console.log(`🔧 Creating ${newProfiles.length} missing profiles...`)
      
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert(newProfiles)

      if (insertError) {
        console.error('❌ Error creating profiles:', insertError)
        throw insertError
      }

      console.log('✅ Successfully created missing profiles')
    }

    // Also ensure default user roles exist
    const { data: existingRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')

    const existingRoleIds = new Set(existingRoles?.map(r => r.user_id) || [])
    const usersNeedingRoles = authUsers.users.filter(user => !existingRoleIds.has(user.id))

    if (usersNeedingRoles.length > 0) {
      console.log(`🔑 Creating roles for ${usersNeedingRoles.length} users...`)
      
      const newRoles = usersNeedingRoles.map(user => ({
        user_id: user.id,
        role: 'user' as const
      }))

      const { error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .insert(newRoles)

      if (rolesError) {
        console.error('❌ Error creating roles:', rolesError)
        // Don't throw here, roles are less critical
      } else {
        console.log('✅ Successfully created missing roles')
      }
    }

    const response = {
      success: true,
      totalAuthUsers: authUsers.users.length,
      existingProfiles: existingProfiles?.length || 0,
      createdProfiles: newProfiles.length,
      createdRoles: usersNeedingRoles.length,
      users: authUsers.users.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }))
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Sync users error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
