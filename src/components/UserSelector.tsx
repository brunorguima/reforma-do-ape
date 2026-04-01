'use client'
import { USERS, type UserID } from '@/lib/constants'

interface UserSelectorProps {
  currentUser: UserID
  onUserChange: (user: UserID) => void
}

export default function UserSelector({ currentUser, onUserChange }: UserSelectorProps) {
  return (
    <div className="user-selector">
      {USERS.map((user) => (
        <button
          key={user.id}
          onClick={() => onUserChange(user.id)}
          className="user-chip"
          style={{
            backgroundColor: currentUser === user.id ? user.color : '#f3f4f6',
            color: currentUser === user.id ? 'white' : '#6b7280',
            borderColor: currentUser === user.id ? user.color : 'transparent',
          }}
        >
          {user.name}
        </button>
      ))}
    </div>
  )
}
