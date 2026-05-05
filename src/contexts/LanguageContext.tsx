import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'vi';

interface Translations {
  [key: string]: string | Translations;
}

const en: Translations = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm",
    loading: "Loading...",
    actions: "Actions",
    search: "Search...",
    noData: "No data found."
  },
  auth: {
    loginTitle: "Welcome Back",
    registerTitle: "Create Account",
    username: "Username",
    password: "Password",
    loginBtn: "Sign In",
    registerBtn: "Sign Up",
    needAccount: "Need an account?",
    hasAccount: "Already have an account?",
    changePassword: "Change Password",
    newPassword: "New Password"
  },
  sidebar: {
    dashboard: "Dashboard",
    sources: "Knowledge Base",
    videos: "Media Assets",
    social: "Distribution",
    studio: "Video Studio",
    config: "CONFIG",
    settings: "Preferences",
    logout: "Logout",
    enterprise: "Enterprise",
    activePlan: "Active Plan",
    language: "Language"
  },
  dashboard: {
    title: "Workspace Dashboard",
    subtitle: "Manage your automated video production pipeline.",
    runPipeline: "Fetch Latest News",
    sources: "Sources",
    articles: "Articles",
    videos: "Videos",
    posted: "Posted",
    activePipeline: "Active Pipeline",
    aiScript: "AI Script",
    generate: "Generate",
    rendering: "Rendering..."
  },
  articles: {
    title: "News Feed",
    manualBtn: "Create Manual",
    clearBtn: "Clear All",
    summarize: "Summarize",
    viewScript: "View Script",
    editScript: "Edit Script",
    generateVideo: "Generate Video",
    emptyState: "No articles found. Try fetching latest news.",
    editTitle: "Edit Video Script",
    editSubtitle: "Refine content before generating visuals.",
    hook: "Hook (The Grabber)",
    body: "Content Body",
    cta: "Call to Action (CTA)",
    addManualTitle: "Add Manual News",
    addManualSubtitle: "Paste content from text, files or documents.",
    articleTitle: "Title",
    articleContent: "Content (Plain text)",
    placeholderTitle: "Enter article title...",
    placeholderContent: "Paste the full content here. AI will summarize this later.",
    manualDesignTab: "Design Script",
    summarizeTab: "Summarize from content",
    addScene: "Add Scene",
    removeScene: "Remove Scene",
    bgImageUrl: "Background Image URL",
    imageKeyword: "Image Keyword"
  },
  sources: {
    title: "Knowledge Base",
    addBtn: "Add Source",
    name: "Source Name",
    url: "RSS/Website URL",
    type: "Type",
    addTitle: "Add New Source"
  },
  videos: {
    title: "Media Library",
    play: "Play Video",
    postTikTok: "Post to TikTok",
    status: "Status",
    ready: "Ready",
    posted: "Published",
    failed: "Failed"
  }
};

const vi: Translations = {
  common: {
    save: "Lưu",
    cancel: "Hủy",
    delete: "Xóa",
    confirm: "Xác nhận",
    loading: "Đang tải...",
    actions: "Hành động",
    search: "Tìm kiếm...",
    noData: "Không có dữ liệu.",
    discard: "Hủy bỏ"
  },
  auth: {
    loginTitle: "Chào mừng trở lại",
    registerTitle: "Tạo tài khoản",
    username: "Tên đăng nhập",
    password: "Mật khẩu",
    loginBtn: "Đăng nhập",
    registerBtn: "Đăng ký",
    needAccount: "Chưa có tài khoản?",
    hasAccount: "Đã có tài khoản?",
    changePassword: "Đổi mật khẩu",
    newPassword: "Mật khẩu mới"
  },
  sidebar: {
    dashboard: "Bảng Điều Khiển",
    sources: "Nguồn Dữ Liệu",
    videos: "Kho Media",
    social: "Phân Phối",
    studio: "Video Studio",
    config: "CẤU HÌNH",
    settings: "Tùy Chọn",
    logout: "Đăng Xuất",
    enterprise: "Doanh Nghiệp",
    activePlan: "Gói Hiện Tại",
    language: "Ngôn Ngữ"
  },
  dashboard: {
    title: "Bảng Điều Khiển",
    subtitle: "Quản lý quy trình sản xuất video tự động.",
    runPipeline: "Cập nhật Tin mới",
    sources: "Nguồn Tin",
    articles: "Bài Báo",
    videos: "Video",
    posted: "Đã Đăng",
    activePipeline: "Tiến Trình Hoạt Động",
    aiScript: "Tạo Kịch Bản",
    generate: "Tạo Video",
    rendering: "Đang Dựng..."
  },
  articles: {
    title: "Danh sách Tin tức",
    manualBtn: "Tạo thủ công",
    clearBtn: "Xóa tất cả",
    summarize: "Tóm tắt",
    viewScript: "Xem kịch bản",
    editScript: "Sửa kịch bản",
    generateVideo: "Tạo Video",
    emptyState: "Không có bài viết nào. Hãy thử cập nhật tin mới.",
    editTitle: "Chỉnh sửa kịch bản",
    editSubtitle: "Tinh chỉnh nội dung trước khi tạo video.",
    hook: "Mở đầu (Hook)",
    body: "Thân bài (Body)",
    cta: "Kêu gọi (CTA)",
    addManualTitle: "Thêm tin tức thủ công",
    addManualSubtitle: "Dán nội dung từ văn bản hoặc tài liệu của bạn.",
    articleTitle: "Tiêu đề",
    articleContent: "Nội dung (Văn bản thô)",
    placeholderTitle: "Nhập tiêu đề bài viết...",
    placeholderContent: "Dán toàn bộ nội dung vào đây. AI sẽ tóm tắt sau.",
    manualDesignTab: "Thiết kế kịch bản",
    summarizeTab: "Tóm tắt từ nội dung",
    addScene: "Thêm cảnh",
    removeScene: "Xóa cảnh",
    bgImageUrl: "URL hình nền",
    imageKeyword: "Từ khóa ảnh"
  },
  sources: {
    title: "Nguồn Dữ Liệu",
    addBtn: "Thêm Nguồn",
    name: "Tên Nguồn",
    url: "URL RSS/Website",
    type: "Loại",
    addTitle: "Thêm Nguồn Mới"
  },
  videos: {
    title: "Kho Video",
    play: "Xem Video",
    postTikTok: "Đăng TikTok",
    status: "Trạng thái",
    ready: "Sẵn sàng",
    posted: "Đã đăng",
    failed: "Lỗi"
  }
};

const translations = { en, vi };

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('vi');

  useEffect(() => {
    const saved = localStorage.getItem('app_language') as Language;
    if (saved && (saved === 'en' || saved === 'vi')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
    document.documentElement.lang = lang;
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    for (const k of keys) {
      if (value === undefined) return key;
      value = value[k];
    }
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
