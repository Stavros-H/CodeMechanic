// Supabase Edge Function: delete-project-assets
// Purpose: Remove all associated PNG image blobs from sprites storage before project deletion
// This prevents orphaned storage blobs when a project is deleted

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configure cors headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { project_id } = await req.json();
    
    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the project data to find all sprite URLs
    const { data: project, error: projectError } = await supabaseClient
      .from("projects")
      .select("project_data")
      .eq("id", project_id)
      .single();

    if (projectError) {
      console.error("Error fetching project:", projectError);
      return new Response(
        JSON.stringify({ error: "Project not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract all sprite URLs from project_data
    const projectData = project.project_data as any;
    const spriteUrls: string[] = [];

    if (projectData?.sprites && Array.isArray(projectData.sprites)) {
      for (const sprite of projectData.sprites) {
        if (sprite.frames) {
          for (const stateKey in sprite.frames) {
            const frames = sprite.frames[stateKey];
            if (Array.isArray(frames)) {
              spriteUrls.push(...frames.filter((url: string) => url && url.includes("sprites")));
            }
          }
        }
        // Also check thumbnail_url
        if (sprite.thumbnail_url) {
          spriteUrls.push(sprite.thumbnail_url);
        }
      }
    }

    // Also check project thumbnail
    if (projectData.thumbnail_url) {
      spriteUrls.push(projectData.thumbnail_url);
    }

    // Extract file paths from URLs
    // Supabase storage URLs follow pattern: https://<bucket>.supabase.co/storage/v1/object/public/sprites/<filepath>
    const filePaths = spriteUrls
      .filter((url) => url && url.includes("storage/v1/object/public/sprites"))
      .map((url) => {
        const parts = url.split("/public/sprites/");
        if (parts.length > 1) {
          return parts[parts.length - 1];
        }
        // Alternative pattern for some URLs
        const parts2 = url.split("/sprites/");
        if (parts2.length > 1) {
          return parts2[parts2.length - 1];
        }
        return null;
      })
      .filter((path): path is string => path !== null);

    // Delete all files from storage
    if (filePaths.length > 0) {
      const { error: deleteError } = await supabaseClient.storage
        .from("sprites")
        .remove(filePaths);

      if (deleteError) {
        console.error("Error deleting files:", deleteError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to delete some files",
            deleted_count: filePaths.length - (deleteError.message?.includes("not found") ? 1 : 0),
            file_paths: filePaths 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Successfully deleted ${filePaths.length} files from sprites bucket`);
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${filePaths.length} sprite files`,
        deleted_files: filePaths,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unhandled error in delete-project-assets:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
