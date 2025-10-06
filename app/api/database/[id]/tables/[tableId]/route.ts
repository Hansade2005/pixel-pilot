import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { validateTableSchema } from "@/lib/validate-schema";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const supabase = getServerSupabase();
    const { id: databaseId, tableId } = params;

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get table with ownership verification
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("*, databases!inner(user_id)")
      .eq("id", tableId)
      .eq("database_id", databaseId)
      .single();

    if (tableError || !table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if ((table.databases as any).user_id !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ table });
  } catch (error: any) {
    console.error("Error fetching table:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const supabase = getServerSupabase();
    const { id: databaseId, tableId } = params;
    const body = await request.json();
    const { name, schema } = body;

    // Validate schema
    const schemaError = validateTableSchema(schema);
    if (schemaError) {
      return NextResponse.json({ error: schemaError }, { status: 400 });
    }

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify table belongs to this database and user owns it
    const { data: existingTable, error: tableError } = await supabase
      .from("tables")
      .select("*, databases!inner(user_id)")
      .eq("id", tableId)
      .eq("database_id", databaseId)
      .single();

    if (tableError || !existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if ((existingTable.databases as any).user_id !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if new name conflicts with existing tables (if name changed)
    if (name && name !== existingTable.name) {
      const { data: duplicateTable } = await supabase
        .from("tables")
        .select("id")
        .eq("database_id", databaseId)
        .eq("name", name)
        .neq("id", tableId)
        .single();

      if (duplicateTable) {
        return NextResponse.json(
          { error: `Table '${name}' already exists in this database` },
          { status: 409 }
        );
      }
    }

    // Update table
    const { data: updatedTable, error: updateError } = await supabase
      .from("tables")
      .update({
        name: name || existingTable.name,
        schema_json: schema,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tableId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: "Table updated successfully",
      table: updatedTable,
    });
  } catch (error: any) {
    console.error("Error updating table:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const supabase = getServerSupabase();
    const { id: databaseId, tableId } = params;

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify table belongs to this database and user owns it
    const { data: existingTable, error: tableError } = await supabase
      .from("tables")
      .select("*, databases!inner(user_id)")
      .eq("id", tableId)
      .eq("database_id", databaseId)
      .single();

    if (tableError || !existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if ((existingTable.databases as any).user_id !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get record count for confirmation
    const { count: recordCount } = await supabase
      .from("records")
      .select("*", { count: "exact", head: true })
      .eq("table_id", tableId);

    // Delete table (records will cascade delete due to FK constraint)
    const { error: deleteError } = await supabase
      .from("tables")
      .delete()
      .eq("id", tableId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: "Table deleted successfully",
      deletedRecords: recordCount || 0,
    });
  } catch (error: any) {
    console.error("Error deleting table:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
