import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id') || 'caf60523-28bd-4136-9663-0c6e417f41c3'

  try {
    // Run all queries in parallel
    const [
      quotesRes,
      paymentsRes,
      measurementsRes,
      tasksRes,
      professionalsRes,
      recentActivityRes,
    ] = await Promise.all([
      // Quotes summary
      supabase
        .from('quotes')
        .select('amount, negotiated_amount, status')
        .eq('project_id', projectId),
      // Payments summary
      supabase
        .from('payments')
        .select('amount, status, due_date')
        .eq('project_id', projectId),
      // Measurements summary
      supabase
        .from('measurements')
        .select('status, total_amount')
        .eq('project_id', projectId),
      // Tasks summary
      supabase
        .from('tasks')
        .select('status')
        .eq('project_id', projectId),
      // Professionals count
      supabase
        .from('professionals')
        .select('id, name')
        .eq('project_id', projectId),
      // Recent activity
      supabase
        .from('activity_log')
        .select('action, description, created_at, performed_by')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const quotes = quotesRes.data || []
    const payments = paymentsRes.data || []
    const measurements = measurementsRes.data || []
    const tasks = tasksRes.data || []
    const professionals = professionalsRes.data || []

    // Compute KPIs
    const totalQuoted = quotes.reduce((s, q) => s + (q.amount || 0), 0)
    const totalContracted = quotes
      .filter(q => q.status === 'contratado')
      .reduce((s, q) => s + (q.negotiated_amount || q.amount || 0), 0)
    const totalPaid = payments
      .filter(p => p.status === 'pago')
      .reduce((s, p) => s + (p.amount || 0), 0)
    const totalPending = payments
      .filter(p => p.status !== 'pago')
      .reduce((s, p) => s + (p.amount || 0), 0)

    const pendingMeasurements = measurements.filter(m => m.status === 'enviada').length
    const pendingTasks = tasks.filter(t => t.status !== 'concluida').length
    const completedTasks = tasks.filter(t => t.status === 'concluida').length

    // Payment schedule (upcoming)
    const upcomingPayments = payments
      .filter(p => p.status !== 'pago' && p.due_date)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 3)

    // Progress percentage (paid / contracted)
    const progress = totalContracted > 0 ? Math.round((totalPaid / totalContracted) * 100) : 0

    return NextResponse.json({
      kpis: {
        totalQuoted,
        totalContracted,
        totalPaid,
        totalPending,
        progress,
        pendingMeasurements,
        pendingTasks,
        completedTasks,
        totalTasks: tasks.length,
        totalProfessionals: professionals.length,
        totalQuotes: quotes.length,
        contractedQuotes: quotes.filter(q => q.status === 'contratado').length,
      },
      upcomingPayments,
      recentActivity: recentActivityRes.data || [],
      professionals: professionals.slice(0, 5),
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
