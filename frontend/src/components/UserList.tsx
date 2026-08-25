import type { User } from "../types/user";

interface Props {
  users: User[];
  onSelectUser: (user: User) => void;
}

export default function UserList({ users, onSelectUser }: Props) {
  return (
    <div className="user-list">
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          className="user-item"
          onClick={() => onSelectUser(user)}
        >
          <div className="user-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-item-content">
            <p className="user-item-name">{user.username}</p>
            <p className="user-item-email">{user.email}</p>
          </div>
        </button>
      ))}
    </div>
  );
}