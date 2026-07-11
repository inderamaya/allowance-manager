/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth as realGetAuth, signInWithEmailAndPassword as realSignIn, signOut as realSignOut, onAuthStateChanged as realOnAuthChanged } from 'firebase/auth'
import {
  collection as realCollection,
  doc as realDoc,
  getDoc as realGetDoc,
  getDocs as realGetDocs,
  setDoc as realSetDoc,
  updateDoc as realUpdateDoc,
  addDoc as realAddDoc,
  query as realQuery,
  where as realWhere,
  orderBy as realOrderBy,
  limit as realLimit,
  onSnapshot as realOnSnapshot,
  deleteDoc as realDeleteDoc,
  serverTimestamp as realServerTimestamp,
  Timestamp as RealTimestamp,
  getFirestore as realGetFirestore
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const isFirebaseConfigured = !!firebaseConfig.apiKey

let app: any
let auth: any
let db: any

// Simple in-memory mock database that can fall back to localStorage in browser or fs in node
class MockFirebaseStore {
  private state: Record<string, Record<string, any>> = {
    admin: {
      credentials: {
        username: 'aeylszh7',
        password: 'aeylSzh@7'
      }
    },
    settings: {
      default: {
        monthlyAllowance: 430.00,
        monthlySavings: 30.00,
        maybankAllocation: 300.00,
        alertEmail: 'admin@example.com'
      }
    },
    manual_offsets: {
      offsets: {
        wallet_offset: 0,
        savings_offset: 0
      }
    },
    transactions: {},
    allowance_stats: {},
    savings_stats: {},
    history: {},
    activity: {
      last: {
        timestamp: new Date().toISOString()
      }
    }
  }

  private listeners: Set<() => void> = new Set()

  constructor() {
    this.load()
  }

  private getFilePath() {
    if (typeof window === 'undefined') {
      try {
        const pathModule = 'path'
        const path = require(pathModule)
        return path.join(process.cwd(), 'firebase_mock_db.json')
      } catch {
        // Safe catch
      }
    }
    return null
  }

  private load() {
    // Try browser local storage
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('firebase_mock_db')
        if (local) {
          this.state = JSON.parse(local)
          return
        }
      } catch {
        // Safe catch
      }
    }

    // Try Node.js FS
    const filePath = this.getFilePath()
    if (filePath) {
      try {
        const fsModule = 'fs'
        const fs = require(fsModule)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')
          this.state = JSON.parse(content)
        } else {
          fs.writeFileSync(filePath, JSON.stringify(this.state, null, 2), 'utf-8')
        }
      } catch {
        // Safe catch
      }
    }
  }

  public save() {
    // Browser Local Storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('firebase_mock_db', JSON.stringify(this.state))
      } catch {
        // Safe catch
      }
    }

    // Node.js FS
    const filePath = this.getFilePath()
    if (filePath) {
      try {
        const fsModule = 'fs'
        const fs = require(fsModule)
        fs.writeFileSync(filePath, JSON.stringify(this.state, null, 2), 'utf-8')
      } catch {
        // Safe catch
      }
    }

    // Trigger listeners
    this.listeners.forEach((l) => {
      try { l() } catch { /* Ignore listener errors */ }
    })
  }

  public addListener(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public getCollection(collectionName: string) {
    if (!this.state[collectionName]) {
      this.state[collectionName] = {}
    }
    return this.state[collectionName]
  }

  public getDoc(collectionName: string, docId: string) {
    const col = this.getCollection(collectionName)
    return col[docId] || null
  }

  public setDoc(collectionName: string, docId: string, data: any) {
    const col = this.getCollection(collectionName)
    col[docId] = { ...data }
    this.save()
  }

  public updateDoc(collectionName: string, docId: string, data: any) {
    const col = this.getCollection(collectionName)
    if (col[docId]) {
      col[docId] = { ...col[docId], ...data }
    } else {
      col[docId] = { ...data }
    }
    this.save()
  }

  public addDoc(collectionName: string, data: any) {
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const docData = { id, ...data }
    this.setDoc(collectionName, id, docData)
    return docData
  }

  public deleteDoc(collectionName: string, docId: string) {
    const col = this.getCollection(collectionName)
    if (col[docId]) {
      delete col[docId]
      this.save()
    }
  }
}

const mockStore = new MockFirebaseStore()

// Mock classes/functions that mirror Firebase modular APIs
const mockAuth = {
  currentUser: {
    email: 'aeylszh7@allowance-manager.com',
    uid: 'mock-admin-uid'
  },
  signInWithEmailAndPassword: async (_auth: any, email: string, pass: string) => {
    const credentials = mockStore.getDoc('admin', 'credentials')
    const username = email.split('@')[0]
    if (
      (username === 'aeylszh7' && pass === 'aeylSzh@7') ||
      (credentials && credentials.username === username && credentials.password === pass)
    ) {
      mockAuth.currentUser = { email, uid: 'mock-admin-uid' }
      return { user: mockAuth.currentUser }
    }
    throw new Error('Auth failed: invalid credentials')
  },
  signOut: async () => {
    mockAuth.currentUser = null as any
  },
  onAuthStateChanged: (authInstance: any, callback: any) => {
    callback(mockAuth.currentUser)
    return () => {}
  }
}

const mockDb = {
  _isMock: true
}

export class MockTimestamp {
  constructor(public seconds: number, public nanoseconds: number) {}
  static now() {
    const now = new Date()
    return new MockTimestamp(Math.floor(now.getTime() / 1000), 0)
  }
  static fromDate(date: Date) {
    return new MockTimestamp(Math.floor(date.getTime() / 1000), 0)
  }
  toDate() {
    return new Date(this.seconds * 1000)
  }
  toISOString() {
    return this.toDate().toISOString()
  }
}

// Firestore mock helpers
export function mockCollection(_db: any, name: string) {
  return { _type: 'collection', name }
}

export function mockDoc(_parent: any, pathOrId?: string, maybeId?: string) {
  let collectionName = ''
  let docId = ''
  if (_parent?._type === 'collection') {
    collectionName = _parent.name
    docId = pathOrId || ''
  } else {
    collectionName = pathOrId || ''
    docId = maybeId || ''
  }
  return { _type: 'document', collectionName, docId }
}

export async function mockGetDoc(docRef: any) {
  const data = mockStore.getDoc(docRef.collectionName, docRef.docId)
  return {
    exists: () => data !== null,
    data: () => data,
    id: docRef.docId
  }
}

export async function mockGetDocs(queryRef: any) {
  const collectionName = queryRef.collectionName || queryRef.name
  const col = mockStore.getCollection(collectionName)
  let docs = Object.values(col).map((doc: any) => ({
    id: doc.id || '',
    data: () => doc
  }))

  // Apply basic query filters if any
  if (queryRef.filters) {
    for (const f of queryRef.filters) {
      if (f.type === 'where') {
        docs = docs.filter((docObj: any) => {
          const docData = docObj.data()
          const val = docData[f.field]
          if (f.op === '==') return val === f.val
          if (f.op === '>=') return val >= f.val
          if (f.op === '<=') return val <= f.val
          if (f.op === '>') return val > f.val
          if (f.op === '<') return val < f.val
          return true
        })
      }
    }
  }

  // Apply sorting
  if (queryRef.sorts) {
    for (const s of queryRef.sorts) {
      docs.sort((a: any, b: any) => {
        const valA = a.data()[s.field]
        const valB = b.data()[s.field]
        if (valA === undefined || valA === null) return 1
        if (valB === undefined || valB === null) return -1
        if (valA < valB) return s.dir === 'desc' ? 1 : -1
        if (valA > valB) return s.dir === 'desc' ? -1 : 1
        return 0
      })
    }
  }

  // Apply limit
  if (queryRef.lim !== undefined) {
    docs = docs.slice(0, queryRef.lim)
  }

  return {
    empty: docs.length === 0,
    docs,
    forEach: (cb: any) => docs.forEach(cb)
  }
}

export async function mockSetDoc(docRef: any, data: any, options?: any) {
  if (options?.merge) {
    const existing = mockStore.getDoc(docRef.collectionName, docRef.docId) || {}
    mockStore.setDoc(docRef.collectionName, docRef.docId, { ...existing, ...data })
  } else {
    mockStore.setDoc(docRef.collectionName, docRef.docId, data)
  }
}

export async function mockUpdateDoc(docRef: any, data: any) {
  mockStore.updateDoc(docRef.collectionName, docRef.docId, data)
}

export async function mockAddDoc(collectionRef: any, data: any) {
  const inserted = mockStore.addDoc(collectionRef.name, data)
  return { id: inserted.id }
}

export function mockQuery(collectionRef: any, ...constraints: any[]) {
  const queryObj = {
    _type: 'query',
    collectionName: collectionRef.name,
    filters: [] as any[],
    sorts: [] as any[],
    lim: undefined as number | undefined
  }
  for (const c of constraints) {
    if (c.type === 'where') queryObj.filters.push(c)
    if (c.type === 'orderBy') queryObj.sorts.push(c)
    if (c.type === 'limit') queryObj.lim = c.val
  }
  return queryObj
}

export function mockWhere(field: string, op: string, val: any) {
  return { type: 'where', field, op, val }
}

export function mockOrderBy(field: string, dir: string = 'asc') {
  return { type: 'orderBy', field, dir }
}

export function mockLimit(val: number) {
  return { type: 'limit', val }
}

export function mockOnSnapshot(ref: any, callback: any) {
  const trigger = async () => {
    if (ref._type === 'document') {
      const snap = await mockGetDoc(ref)
      callback(snap)
    } else {
      const snap = await mockGetDocs(ref)
      callback(snap)
    }
  }
  trigger()
  return mockStore.addListener(trigger)
}

export function mockDeleteDoc(docRef: any) {
  mockStore.deleteDoc(docRef.collectionName, docRef.docId)
}

// Standard exported references
if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
    auth = realGetAuth(app)
    db = realGetFirestore(app)
  } catch {
    console.error('Firebase initialization error, falling back to mock:')
    app = {}
    auth = mockAuth
    db = mockDb
  }
} else {
  app = {}
  auth = mockAuth
  db = mockDb
}

// Unified exports that route to real or mock implementations
export const signInWithEmailAndPassword = (isFirebaseConfigured ? realSignIn : mockAuth.signInWithEmailAndPassword) as any
export const signOut = (isFirebaseConfigured ? realSignOut : mockAuth.signOut) as any
export const onAuthStateChanged = (isFirebaseConfigured ? realOnAuthChanged : mockAuth.onAuthStateChanged) as any

export const collection = (isFirebaseConfigured ? realCollection : mockCollection) as any
export const doc = (isFirebaseConfigured ? realDoc : mockDoc) as any
export const getDoc = (isFirebaseConfigured ? realGetDoc : mockGetDoc) as any
export const getDocs = (isFirebaseConfigured ? realGetDocs : mockGetDocs) as any
export const setDoc = (isFirebaseConfigured ? realSetDoc : mockSetDoc) as any
export const updateDoc = (isFirebaseConfigured ? realUpdateDoc : mockUpdateDoc) as any
export const addDoc = (isFirebaseConfigured ? realAddDoc : mockAddDoc) as any
export const query = (isFirebaseConfigured ? realQuery : mockQuery) as any
export const where = (isFirebaseConfigured ? realWhere : mockWhere) as any
export const orderBy = (isFirebaseConfigured ? realOrderBy : mockOrderBy) as any
export const limit = (isFirebaseConfigured ? realLimit : mockLimit) as any
export const onSnapshot = (isFirebaseConfigured ? realOnSnapshot : mockOnSnapshot) as any
export const deleteDoc = (isFirebaseConfigured ? realDeleteDoc : mockDeleteDoc) as any
export const serverTimestamp = (isFirebaseConfigured ? realServerTimestamp : () => new Date().toISOString()) as any
export const Timestamp = (isFirebaseConfigured ? RealTimestamp : MockTimestamp) as any

export { app, auth, db, isFirebaseConfigured }
