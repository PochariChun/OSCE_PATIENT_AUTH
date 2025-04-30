// 格式化日期
function formatDate(dateString: string) {
  if (!dateString) return '未知';
  
  const date = new Date(dateString);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 在頁面中顯示
<div className="mt-4">
  <p className="text-sm text-gray-500 dark:text-gray-400">
    註冊時間: {formatDate(user.createdAt)}
  </p>
  <p className="text-sm text-gray-500 dark:text-gray-400">
    最後更新: {formatDate(user.updatedAt)}
  </p>
</div>

const [name, setName] = useState(user?.name || '');

// 在表單中
<div>
  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
    姓名
  </label>
  <input
    type="text"
    name="name"
    id="name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
  />
</div>

const [user, setUser] = useState(null);
const [error, setError] = useState('');
const [loading, setLoading] = useState(true);
const router = useRouter();

// 在 useEffect 中
useEffect(() => {
  const fetchUserData = async () => {
    try {
      const userJson = localStorage.getItem('user');
      if (!userJson) {
        setError('請先登入');
        router.push('/login');
        return;
      }
      
      const userData = JSON.parse(userJson);
      setUser(userData);
      setName(userData.name || '');
    } catch (error) {
      console.error('獲取用戶資料失敗:', error);
      setError('獲取用戶資料失敗，請重新登入');
    } finally {
      setLoading(false);
    }
  };
  
  fetchUserData();
}, [router]); 