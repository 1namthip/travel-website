import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generalApiRateLimit } from "@/lib/rate-limit";

// ─── Helper: ดึงข้อมูล User และ Role จาก Supabase ────────────────────────────

export const getSessionUserWithRole = async () => {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      role: null,
    };
  }

  // ดึง Role จาก profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    user,
    role: profile?.role ?? "user",
  };
};

// ─── GET /api/reviews ────────────────────────────────────────────────────────
// ดึงรีวิวพร้อมชื่อผู้รีวิว

export const GET = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);

    const accommodation_id = searchParams.get("accommodation_id");
    const restaurant_id = searchParams.get("restaurant_id");
    const destination_id = searchParams.get("destination_id");

    let query = supabaseAdmin
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (accommodation_id) {
      query = query.eq("accommodation_id", accommodation_id);
    }

    if (restaurant_id) {
      query = query.eq("restaurant_id", Number(restaurant_id));
    }

    if (destination_id) {
      query = query.eq("destination_id", Number(destination_id));
    }

    const { data: reviews, error } = await query;

    if (error) {
      throw error;
    }

    // ไม่มีรีวิว
    if (!reviews || reviews.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // ─────────────────────────────────────────────────────────────
    // ดึง User ID ของคนที่เขียนรีวิวทั้งหมด
    // ─────────────────────────────────────────────────────────────

    const userIds = [
      ...new Set(
        reviews
          .map((review) => review.created_by)
          .filter(
            (id): id is string =>
              typeof id === "string" && id.trim().length > 0
          )
      ),
    ];

    // ─────────────────────────────────────────────────────────────
    // ดึงข้อมูล profiles
    //
    // ใช้ select("*") เพื่อไม่ผูกกับชื่อ column เพียงชื่อเดียว
    // รองรับ full_name / name / username / display_name
    // ─────────────────────────────────────────────────────────────

    let profiles: any[] = [];

    if (userIds.length > 0) {
      const { data: profileData, error: profileError } =
        await supabaseAdmin
          .from("profiles")
          .select("*")
          .in("id", userIds);

      if (profileError) {
        console.error("GET profiles error:", profileError);
      } else {
        profiles = profileData ?? [];
      }
    }

    // ─────────────────────────────────────────────────────────────
    // รวมข้อมูลชื่อเข้ากับรีวิว
    // ─────────────────────────────────────────────────────────────

    const reviewsWithUser = reviews.map((review) => {
      const profile = profiles.find(
        (item) => item.id === review.created_by
      );

      // รองรับชื่อหลายรูปแบบ
      const displayName =
        profile?.full_name ||
        profile?.name ||
        profile?.username ||
        profile?.display_name ||
        profile?.first_name ||
        null;

      return {
        ...review,

        // ส่งชื่อให้ Frontend ใช้ง่าย
        user_name: displayName,

        // ส่งข้อมูล user เพิ่มด้วย
        user: profile
          ? {
              id: profile.id,
              name: displayName,
              full_name: profile.full_name ?? null,
              username: profile.username ?? null,
            }
          : null,
      };
    });

    return NextResponse.json(reviewsWithUser, {
      status: 200,
    });
  } catch (error: any) {
    console.error("GET /api/reviews error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Failed to fetch reviews",
      },
      {
        status: 400,
      }
    );
  }
};

// ─── POST /api/reviews ───────────────────────────────────────────────────────

export const POST = async (req: Request) => {
  try {
    const { user } = await getSessionUserWithRole();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate Limit ป้องกันการสแปมรีวิว
    const { success } = await generalApiRateLimit.limit(
      `post_review_${user.id}`
    );

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      );
    }

    const {
      accommodation_id,
      restaurant_id,
      destination_id,
      rating,
      comment,
    } = body as Record<string, any>;

    const providedIds = [
      accommodation_id,
      restaurant_id,
      destination_id,
    ].filter(Boolean);

    if (providedIds.length !== 1) {
      return NextResponse.json(
        {
          error: "Please provide exactly one target ID.",
        },
        { status: 400 }
      );
    }

    if (!rating || typeof rating !== "number") {
      return NextResponse.json(
        {
          error: "Valid rating is required.",
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // บันทึก user.id ลง created_by
    // ─────────────────────────────────────────────────────────────

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .insert([
        {
          accommodation_id:
            accommodation_id || null,

          restaurant_id:
            restaurant_id
              ? Number(restaurant_id)
              : null,

          destination_id:
            destination_id
              ? Number(destination_id)
              : null,

          rating: Number(rating),

          comment,

          // สำคัญมาก:
          // เก็บ ID ของผู้ใช้ที่ Login อยู่
          created_by: user.id,
        },
      ])
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, {
      status: 201,
    });
  } catch (error: any) {
    console.error("POST /api/reviews error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
};

// ─── PUT /api/reviews ────────────────────────────────────────────────────────

export const PUT = async (req: Request) => {
  try {
    const { user, role } =
      await getSessionUserWithRole();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { success } =
      await generalApiRateLimit.limit(
        `put_review_${user.id}`
      );

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      );
    }

    const {
      id,
      rating,
      comment,
    } = body as {
      id?: string;
      rating?: number;
      comment?: string;
    };

    if (!id) {
      return NextResponse.json(
        { error: "Review ID is required." },
        { status: 400 }
      );
    }

    const isAdmin = role === "admin";

    const updatePayload: {
      rating?: number;
      comment?: string;
    } = {};

    if (
      rating !== undefined &&
      rating !== null
    ) {
      updatePayload.rating = Number(rating);
    }

    if (comment !== undefined) {
      updatePayload.comment = comment;
    }

    if (
      Object.keys(updatePayload).length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No data provided to update.",
        },
        { status: 400 }
      );
    }

    let query =
      supabaseAdmin
        .from("reviews")
        .update(updatePayload);

    if (isAdmin) {
      query = query.eq("id", id);
    } else {
      query = query
        .eq("id", id)
        .eq("created_by", user.id);
    }

    const { data, error } =
      await query.select();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          error:
            "Review not found or permission denied.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(data, {
      status: 200,
    });
  } catch (error: any) {
    console.error(
      "PUT /api/reviews error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Internal Server Error",
      },
      { status: 500 }
    );
  }
};

// ─── DELETE /api/reviews ─────────────────────────────────────────────────────

export const DELETE = async (req: Request) => {
  try {
    const { user, role } =
      await getSessionUserWithRole();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { success } =
      await generalApiRateLimit.limit(
        `delete_review_${user.id}`
      );

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const { searchParams } =
      new URL(req.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Review ID is required." },
        { status: 400 }
      );
    }

    const isAdmin = role === "admin";

    let query =
      supabaseAdmin
        .from("reviews")
        .delete();

    if (isAdmin) {
      query = query.eq("id", id);
    } else {
      query = query
        .eq("id", id)
        .eq("created_by", user.id);
    }

    const { data, error } =
      await query.select();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          error:
            "Review not found or permission denied.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        message:
          "Review deleted successfully",
        deleted_id: id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "DELETE /api/reviews error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Internal Server Error",
      },
      { status: 500 }
    );
  }
};