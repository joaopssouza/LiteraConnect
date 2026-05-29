import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { ObjectId } from 'mongodb';

// GET — lista todos os rascunhos do usuário autenticado
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { user } = auth;

  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db('literaconnect');

    const drafts = await db
      .collection('drafts')
      .find({ author_id: user.id, status: 'draft' })
      .sort({ updated_at: -1 })
      .limit(50)
      .project({ title: 1, visibility: 1, created_at: 1, updated_at: 1 })
      .toArray();

    return NextResponse.json({ drafts: drafts.map((d) => ({ ...d, id: d._id.toString() })) });
  } catch (error: any) {
    console.error('Error listing drafts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST — cria novo rascunho
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { user } = auth;

  try {
    const body = await req.json();
    const { title, content, visibility } = body;

    if (!title?.trim() && (!content || content === '<p></p>')) {
      return NextResponse.json({ error: 'Título ou conteúdo obrigatório.' }, { status: 400 });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db('literaconnect');

    const result = await db.collection('drafts').insertOne({
      author_id: user.id,
      title: title?.trim() || '',
      content: content || '',
      visibility: visibility || 'public',
      created_at: new Date(),
      updated_at: new Date(),
      status: 'draft',
    });

    return NextResponse.json({ draftId: result.insertedId.toString() }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating draft:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT — atualiza rascunho existente (auto-save)
export async function PUT(req: Request) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { user } = auth;

  try {
    const body = await req.json();
    const { id, title, content, visibility } = body;

    if (!id) {
      return NextResponse.json({ error: 'Draft ID obrigatório.' }, { status: 400 });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db('literaconnect');

    const result = await db.collection('drafts').updateOne(
      { _id: new ObjectId(id), author_id: user.id },
      {
        $set: {
          title: title?.trim() || '',
          content: content || '',
          visibility: visibility || 'public',
          updated_at: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Rascunho não encontrado ou sem permissão.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating draft:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE — remove rascunho
export async function DELETE(req: Request) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { user } = auth;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Draft ID obrigatório.' }, { status: 400 });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db('literaconnect');

    const result = await db.collection('drafts').deleteOne({
      _id: new ObjectId(id),
      author_id: user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Rascunho não encontrado ou sem permissão.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
