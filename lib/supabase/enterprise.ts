import { createClient } from './client'

export interface DemoRequest {
  id?: string
  name: string
  email: string
  company: string
  role: string
  company_size: string
  message: string
  created_at?: string
  status?: 'pending' | 'contacted' | 'scheduled' | 'completed'
}

export interface ContactRequest {
  id?: string
  name: string
  email: string
  company: string
  phone: string
  message: string
  created_at?: string
  status?: 'pending' | 'contacted' | 'qualified' | 'closed'
}

export interface ProposalRequest {
  id?: string
  name: string
  email: string
  company: string
  company_size: string
  requirements: string
  timeline: string
  created_at?: string
  status?: 'pending' | 'reviewing' | 'sent' | 'accepted' | 'rejected'
}

class EnterpriseService {
  private supabase = createClient()

  // Demo Requests
  async submitDemoRequest(request: Omit<DemoRequest, 'id' | 'created_at' | 'status'>) {
    try {
      const { data, error } = await this.supabase
        .from('enterprise_demo_requests')
        .insert([
          {
            ...request,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error submitting demo request:', error)
      return { data: null, error }
    }
  }

  async getDemoRequests() {
    try {
      const { data, error } = await this.supabase
        .from('enterprise_demo_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching demo requests:', error)
      return { data: null, error }
    }
  }

  async updateDemoRequestStatus(id: string, status: DemoRequest['status']) {
    try {
      const { data, error } = await this.supabase
        .from('enterprise_demo_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error updating demo request:', error)
      return { data: null, error }
    }
  }

  // Contact Requests
  async submitContactRequest(request: Omit<ContactRequest, 'id' | 'created_at' | 'status'>) {
    try {
      const { data, error } = await this.supabase
        .from('enterprise_contact_requests')
        .insert([
          {
            ...request,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error submitting contact request:', error)
      return { data: null, error }
    }
  }

  async getContactRequests() {
    try {
      const { data, error } = await this.supabase
        .from('enterprise_contact_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching contact requests:', error)
      return { data: null, error }
    }
  }

  async updateContactRequestStatus(id: string, status: ContactRequest['status']) {
    try {
      const { data, error } = await this.supabase
        .from('enterprise_contact_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error updating contact request:', error)
      return { data: null, error }
    }
  }

  // Proposal Requests
  async submitProposalRequest(request: Omit<ProposalRequest, 'id' | 'created_at' | 'status'>) {
    try {
      const { data, error } = await this.supabase
        .from('enterprise_proposal_requests')
        .insert([
          {
            ...request,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error submitting proposal request:', error)
      return { data: null, error }
    }
  }

  async getProposalRequests() {
    try {
      const { data, error } = await this.supabase
        .from('enterprise_proposal_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching proposal requests:', error)
      return { data: null, error }
    }
  }

  async updateProposalRequestStatus(id: string, status: ProposalRequest['status']) {
    try {
      const { data, error } = await this.supabase
        .from('enterprise_proposal_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error updating proposal request:', error)
      return { data: null, error }
    }
  }
}

export const enterpriseService = new EnterpriseService()
