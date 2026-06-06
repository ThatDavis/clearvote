import { NextResponse } from 'next/server'

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status })
export const created = (data: unknown) => NextResponse.json(data, { status: 201 })
export const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 })
export const unauthorized = () => NextResponse.json({ error: 'Not authorized' }, { status: 403 })
export const notFound = (error = 'Not found') => NextResponse.json({ error }, { status: 404 })
