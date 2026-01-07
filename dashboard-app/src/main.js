import './style.css';

document.querySelector('#app').innerHTML = `
  <div class="flex h-screen bg-[#f0f4f8] p-4 gap-4 overflow-hidden font-sans">
    <!-- Sidebar -->
    <aside class="w-24 bg-white rounded-2xl border border-blue-100 flex flex-col items-center py-8 gap-12 shadow-sm">
      <div class="flex flex-col items-center gap-1 cursor-pointer group">
        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
        </div>
        <span class="text-[10px] font-bold text-gray-800 tracking-wider">OVERVIEW</span>
      </div>
      <div class="flex flex-col items-center gap-1 cursor-pointer group">
        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <span class="text-[10px] font-bold text-gray-800 tracking-wider">WORK DONE</span>
      </div>
      <div class="flex flex-col items-center gap-1 cursor-pointer group">
        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        </div>
        <span class="text-[10px] font-bold text-gray-800 tracking-wider">VOs</span>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex gap-4 overflow-hidden">
      <!-- Left Column: Contract Value & Small Bar Chart -->
      <div class="w-80 flex flex-col gap-4">
        <!-- Contract Value Chart -->
        <div class="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm flex-1 flex flex-col">
          <h2 class="text-center font-bold text-gray-600 text-lg mb-4">GIÁ TRỊ HỢP ĐỒNG</h2>
          
          <!-- Legend -->
          <div class="flex flex-col gap-2 mb-8 text-xs font-semibold text-gray-500 ml-4">
             <div class="flex items-center gap-2">
                <span class="w-4 h-2 bg-[#ed8936] rounded-sm"></span>
                <span>NC</span>
                <span class="ml-auto mr-4">7,786</span>
             </div>
             <div class="flex items-center gap-2">
                <span class="w-4 h-2 bg-[#bee3f8] rounded-sm"></span>
                <span>VT</span>
                <span class="ml-auto mr-4 text-[#1ea7b0]">2,092</span>
             </div>
             <div class="flex items-center gap-2">
                <span class="w-4 h-2 bg-[#2c7a7b] rounded-full border-2 border-white"></span>
                <span>NC + VT</span>
                <span class="ml-auto mr-4">5,694</span>
             </div>
          </div>

          <!-- Bar Chart Area -->
          <div class="flex-1 flex items-end justify-between px-4 pb-8 relative">
             <!-- Chart SVG / Bars -->
             <div class="relative h-full w-full flex items-end justify-around">
               <!-- Bar 1 -->
               <div class="flex flex-col items-center gap-1 w-12 group">
                 <span class="text-[10px] text-gray-400">3,826</span>
                 <div class="w-full flex flex-col">
                    <div class="h-16 bg-[#bee3f8] relative">
                       <span class="absolute inset-0 flex items-center justify-center text-[10px] text-gray-600 font-bold">1,561</span>
                    </div>
                    <div class="h-24 bg-[#ed8936] relative">
                       <span class="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">2,266</span>
                    </div>
                 </div>
                 <span class="text-[10px] font-bold text-gray-400 mt-2">Ban đầu</span>
               </div>
               
               <!-- Bar 2 -->
               <div class="flex flex-col items-center gap-1 w-12 group">
                 <span class="text-[10px] text-gray-400">3,960</span>
                 <div class="w-full flex flex-col">
                    <div class="h-6 bg-[#bee3f8] relative">
                       <span class="absolute -top-4 left-0 right-0 text-center text-[10px] text-gray-600 font-bold">531</span>
                    </div>
                    <div class="h-32 bg-[#ed8936] relative">
                       <span class="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">3,428</span>
                    </div>
                 </div>
                 <span class="text-[10px] font-bold text-gray-400 mt-2">Phát sinh</span>
               </div>

               <!-- Bar 3 -->
               <div class="flex flex-col items-center gap-1 w-12 group">
                 <div class="w-full flex flex-col">
                    <div class="h-12 bg-[#bee3f8] relative">
                       <span class="absolute -top-4 left-0 right-0 text-center text-[10px] text-gray-600 font-bold">2,092</span>
                    </div>
                    <div class="h-44 bg-[#ed8936] relative">
                       <span class="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">5,694</span>
                    </div>
                 </div>
                 <span class="text-[10px] font-bold text-gray-400 mt-2">Điều chỉnh</span>
               </div>

               <!-- Line Chart Overlay -->
               <svg class="absolute inset-0 w-full h-[80%] pointer-events-none overflow-visible" preserveAspectRatio="none">
                  <path d="M 24 100 L 72 80 L 120 20" fill="none" stroke="#2c7a7b" stroke-width="2" />
                  <circle cx="24" cy="100" r="3" fill="#2c7a7b" stroke="white" stroke-width="2" />
                  <circle cx="72" cy="80" r="3" fill="#2c7a7b" stroke="white" stroke-width="2" />
                  <circle cx="120" cy="20" r="3" fill="#2c7a7b" stroke="white" stroke-width="2" />
               </svg>
             </div>
          </div>
        </div>

        <!-- Small Comparison Bar Chart -->
        <div class="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm h-64 flex flex-col">
            <div class="flex justify-between items-start mb-4">
                <div class="flex flex-col">
                    <span class="text-xs font-bold text-gray-800">▼ -79.4</span>
                    <span class="text-[10px] text-gray-400">96%</span>
                </div>
                <div class="flex flex-col items-end">
                    <span class="text-xs font-bold text-gray-800">▲ +6.1</span>
                    <span class="text-[10px] text-gray-400">100%</span>
                </div>
            </div>
            <div class="flex-1 flex items-end justify-between px-4">
                <div class="flex flex-col items-center gap-2">
                    <div class="w-10 h-32 bg-[#e2e8f0] relative">
                        <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-600">2,171</span>
                    </div>
                    <span class="text-[10px] font-bold text-gray-400">Định mức</span>
                </div>
                <div class="flex flex-col items-center gap-2">
                    <div class="w-10 h-28 bg-[#1ea7b0] relative">
                        <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">2,092</span>
                    </div>
                    <span class="text-[10px] font-bold text-gray-400">Đã nhập</span>
                </div>
                <div class="flex flex-col items-center gap-2">
                    <div class="w-10 h-28 bg-[#bee3f8] relative">
                        <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#1ea7b0]">2,098</span>
                    </div>
                    <span class="text-[10px] font-bold text-gray-400">Đã trừ</span>
                </div>
            </div>
        </div>
      </div>

      <!-- Right Column: Stats + Wide Charts -->
      <div class="flex-1 flex flex-col gap-4 overflow-hidden">
        <!-- Top Stats Row -->
        <div class="grid grid-cols-3 gap-4">
          <!-- Total Card -->
          <div class="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm flex items-center gap-4">
            <div class="flex flex-col">
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TỔNG</span>
              <span class="text-2xl font-black text-gray-800">7,547</span>
            </div>
            <div class="relative w-20 h-20 ml-auto">
              <svg class="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="32" stroke="#f0f9ff" stroke-width="8" fill="none" />
                <circle cx="40" cy="40" r="32" stroke="#1ea7b0" stroke-width="8" fill="none" stroke-dasharray="201" stroke-dashoffset="6" stroke-linecap="round" />
              </svg>
              <span class="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">97%</span>
            </div>
          </div>
          <!-- Labor Card -->
          <div class="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm flex items-center gap-4">
            <div class="flex flex-col">
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">NHÂN CÔNG</span>
              <span class="text-2xl font-black text-gray-800">5,621</span>
            </div>
            <div class="relative w-20 h-20 ml-auto">
              <svg class="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="32" stroke="#f0f9ff" stroke-width="8" fill="none" />
                <circle cx="40" cy="40" r="32" stroke="#1ea7b0" stroke-width="8" fill="none" stroke-dasharray="201" stroke-dashoffset="2" stroke-linecap="round" />
              </svg>
              <span class="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">99%</span>
            </div>
          </div>
          <!-- Incidental Card -->
          <div class="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm flex items-center gap-4">
            <div class="flex flex-col">
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">PHÁT SINH</span>
              <span class="text-2xl font-black text-gray-800">5,163</span>
            </div>
            <div class="relative w-20 h-20 ml-auto">
              <svg class="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="32" stroke="#f0f9ff" stroke-width="8" fill="none" />
                <circle cx="40" cy="40" r="32" stroke="#1ea7b0" stroke-width="8" fill="none" stroke-dasharray="201" stroke-dashoffset="0" stroke-linecap="round" />
              </svg>
              <span class="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">100%</span>
            </div>
          </div>
        </div>

        <!-- Middle Wide Bar Chart -->
        <div class="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm h-64 flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <h2 class="font-bold text-gray-600 text-sm uppercase">GIÁ TRỊ THANH TOÁN THEO ĐỢT</h2>
            <div class="flex gap-4 text-[10px] font-bold">
               <div class="flex items-center gap-1">
                 <span class="w-3 h-3 bg-[#1ea7b0]"></span>
                 <span class="text-gray-500 uppercase">GT THỰC HIỆN</span>
               </div>
               <div class="flex items-center gap-1">
                 <span class="w-3 h-1 bg-[#ed8936]"></span>
                 <span class="text-gray-500 uppercase">GT NHÂN CÔNG</span>
               </div>
            </div>
          </div>
          <div class="flex-1 flex items-end justify-between px-2 gap-1 relative pt-8">
            <!-- Mock Bar Clusters 1-13 -->
            ${[20, 15, 18, 25, 22, 50, 35, 45, 40, 28, 30, 15, 10].map((h, i) => {
  const laborPos = [5, 4, 6, 8, 7, 12, 10, 11, 9, 7, 6, 4, 3][i];
  const val = [351, 220, 273, 539, 430, 1714, 804, 1018, 918, 440, 449, 268, 122][i];
  const laborVal = [207, 143, 144, 318, 343, 995, 455, 839, 828, 433, 418, 252, 245][i];
  return \`
                <div class="flex-1 flex flex-col items-center group relative">
                   <span class="text-[8px] font-bold text-[#1ea7b0] mb-0.5 whitespace-nowrap">\${val}</span>
                   <div class="w-full bg-[#1ea7b0] relative" style="height: \${h * 2}px">
                      <!-- Labor Line indicator -->
                      <div class="absolute w-full h-0.5 bg-[#ed8936] left-0" style="bottom: \${laborPos * 2}px">
                         <span class="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-bold text-[#ed8936]">\${laborVal}</span>
                      </div>
                   </div>
                   <span class="mt-1 text-[10px] font-bold text-gray-400">\${i + 1}</span>
                </div>
              \`;
            }).join('')}
          </div>
        </div>

        <!-- Table Row -->
        <div class="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm flex-1 flex flex-col overflow-hidden">
           <div class="bg-[#f0f9ff] text-[#1ea7b0] py-2 px-4 rounded-lg text-center font-black text-sm mb-4 tracking-widest border border-blue-100">
             CHI TIẾT VẬT TƯ
           </div>
           <div class="flex-1 overflow-auto">
             <table class="w-full text-left">
               <thead class="sticky top-0 bg-white border-b-2 border-blue-50">
                 <tr class="text-[10px] font-black text-gray-600 uppercase tracking-tighter">
                   <th class="py-2 px-2 text-center w-8">#</th>
                   <th class="py-2 px-2">VẬT TƯ</th>
                   <th class="py-2 px-2 text-right">ĐỊNH MỨC</th>
                   <th class="py-2 px-2 text-right">THỰC NHẬN</th>
                   <th class="py-2 px-2 text-right">ĐÃ TRỪ</th>
                   <th class="py-2 px-2 text-right">TN/ĐM</th>
                   <th class="py-2 px-2 text-right">TN/ĐM</th>
                   <th class="py-2 px-2 text-right">ĐT/ĐM</th>
                 </tr>
               </thead>
               <tbody class="text-[11px] font-bold text-gray-700">
                 ${[
      ['Bột trét ngoài', 303, 415, 444, '37%', '37%', '7%', 'up'],
      ['Sơn lót ngoài', 219, 144, 143, '-34%', '-34%', '-1%', 'none'],
      ['Sơn gai', 793, 351, 354, '-56%', '-56%', '1%', 'none'],
      ['JOTUN 1284', 664, 761, 933, '15%', '15%', '23%', 'up'],
      ['JOTUN 1916', 61, 87, 87, '43%', '43%', '0%', 'none'],
      ['JOTUN 1434', 35, 45, 45, '28%', '28%', '0%', 'none'],
      ['Penguard Primer', 16, 11, 35, '-31%', '-31%', '226%', 'up'],
      ['Hardtop AX', 80, 93, 57, '16%', '16%', '-38%', 'down']
    ].map((row, i) => \`
                   <tr class="border-b border-gray-50 hover:bg-blue-50 transition-colors">
                     <td class="py-1.5 px-2 text-center text-gray-400 font-normal">\${i + 1}</td>
                     <td class="py-1.5 px-2">\${row[0]}</td>
                     <td class="py-1.5 px-2 text-right">\${row[1]}</td>
                     <td class="py-1.5 px-2 text-right">\${row[2]}</td>
                     <td class="py-1.5 px-2 text-right">\${row[3]}</td>
                     <td class="py-1.5 px-2 text-right">\${row[4]}</td>
                     <td class="py-1.5 px-2 text-right">\${row[5]}</td>
                     <td class="py-1.5 px-2 text-right flex items-center justify-end gap-1">
                        \${row[6]}
                        \${row[7] === 'up' ? '<span class="text-green-500">▲</span>' : row[7] === 'down' ? '<span class="text-red-400">▼</span>' : ''}
                     </td>
                   </tr>
                 \`).join('')}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </main>
  </div>
\`;
