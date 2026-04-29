'use client'
import { USERS, type UserID } from '@/lib/constants'

interface UserSelectorProps {
  currentUser: UserID
  onUserChange: (user: UserID) => void
  allowedUsers?: UserID[]
}

export default function UserSelector({ currentUser, onUserChange, allowedUsers }: UserSelectorProps) {
  const visibleUsers = allowedUsers
    ? USERS.filter(u => allowedUsers.includes(u.id))
    : USERS

  return (
    <div className="user-selector">
      {visibleUsers.map((user) => (
        <button
          key={user.id}
          onClick={() => onUserChange(user.id)}
          className="user-chip"
          style={{
            backgroundColor: currentUser === user.id ? user.color : 'rgba(255,255,255,0.1)',
            color: currentUser === user.id ? 'white' : 'rgba(255,255,255,0.6)',
            borderColor: currentUser === user.id ? user.color : 'transparent',
          }}
        >
          {user.name}
        </button>
      ))}
    </div>
  )
}
