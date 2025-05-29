
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

    console.log(`✅ Found ${authUsers.users.length} auth users`)

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

    let createdProfiles = 0;
    let createdRoles = 0;

    // Create profiles for missing users one by one to handle conflicts
    for (const user of missingUsers) {
      try {
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert({
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
          })

        if (insertError) {
          console.error(`❌ Error creating profile for ${user.email}:`, insertError)
        } else {
          console.log(`✅ Created profile for ${user.email}`)
          createdProfiles++
        }
      } catch (error) {
        console.error(`❌ Failed to create profile for ${user.email}:`, error)
      }
    }

    // Ensure all users have roles
    const { data: existingRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')

    const existingRoleIds = new Set(existingRoles?.map(r => r.user_id) || [])
    const usersNeedingRoles = authUsers.users.filter(user => !existingRoleIds.has(user.id))

    for (const user of usersNeedingRoles) {
      try {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'user'
          })

        if (roleError) {
          console.error(`❌ Error creating role for ${user.email}:`, roleError)
        } else {
          console.log(`✅ Created role for ${user.email}`)
          createdRoles++
        }
      } catch (error) {
        console.error(`❌ Failed to create role for ${user.email}:`, error)
      }
    }

    const response = {
      success: true,
      totalAuthUsers: authUsers.users.length,
      existingProfiles: existingProfiles?.length || 0,
      createdProfiles,
      createdRoles,
      message: `Sync completed: ${createdProfiles} profiles and ${createdRoles} roles created`
    }

    console.log('✅ Sync completed:', response)

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
