
import { deleteUser } from '../../actions'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = params.id
  await deleteUser(userId)
  return NextResponse.redirect(new URL('/admin/users', request.url))
}
