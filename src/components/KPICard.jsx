export default function KPICard({ title, value, subtitle, color = "blue", icon: Icon }) {
  const colors = {
    blue: "border-l-blue-500 text-blue-600",
    green: "border-l-green-500 text-green-600",
    red: "border-l-red-500 text-red-600",
    purple: "border-l-purple-500 text-purple-600",
    orange: "border-l-orange-500 text-orange-600",
    slate: "border-l-slate-500 text-slate-600"
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${colors[color]} p-4 lg:p-6`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}