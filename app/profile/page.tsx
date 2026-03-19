'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth()
  const router = useRouter()
  const [f, setF] = useState<Record<string,string>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if(!loading&&!user) router.push('/login')
    if(user) setF({business_name:user.business_name||'',representative:user.representative||'',business_number:user.business_number||'',business_type:user.business_type||'',address:user.address||'',sector:user.sector||'',item:user.item||'',service_desc:user.service_desc||'',target_customer:user.target_customer||'',track_record:user.track_record||'',email:user.email||'',phone:user.phone||''})
  }, [user,loading])

  const s = (k:string,v:string) => setF({...f,[k]:v})
  const save = async () => { setSaving(true); await supabase.from('profiles').update(f).eq('id',user!.id); await refresh(); setSaving(false); setMsg('저장 완료'); setTimeout(()=>setMsg(''),2000) }

  if(loading) return <div className="pt-20 text-center text-[#63636E]">로딩 중...</div>
  return (
    <div className="max-w-[600px] mx-auto pt-7 pb-16 animate-in">
      <h2 className="text-lg font-bold mb-1">사업자 프로필</h2>
      <p className="text-[12.5px] text-[#63636E] mb-5">모든 항목은 선택사항입니다. 입력할수록 결과물 품질이 높아집니다.</p>
      <div className="bg-[#141417] border border-white/[.06] rounded-xl p-5">
        <p className="text-[11px] font-semibold text-[#63636E] uppercase tracking-wider mb-4">사업자등록증 정보</p>
        <div className="grid grid-cols-2 gap-3 mb-3"><I l="상호" v={f.business_name} c={v=>s('business_name',v)} p="크리피에이전시"/><I l="대표자" v={f.representative} c={v=>s('representative',v)} p="홍길동"/></div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <I l="사업자등록번호" v={f.business_number} c={v=>s('business_number',v)} p="000-00-00000"/>
          <div><label className="block text-[11px] font-medium text-[#63636E] mb-1.5">사업자 유형</label><select value={f.business_type} onChange={e=>s('business_type',e.target.value)} className="inp"><option value="">선택</option><option>개인 일반</option><option>개인 간이</option><option>법인</option></select></div>
          <I l="개업일" v={f.opening_date||''} c={v=>s('opening_date',v)} t="date"/>
        </div>
        <I l="사업장 소재지" v={f.address} c={v=>s('address',v)} p="서울특별시 강남구" cls="mb-3"/>
        <div className="grid grid-cols-2 gap-3 mb-3"><I l="업태" v={f.sector} c={v=>s('sector',v)} p="서비스업"/><I l="종목" v={f.item} c={v=>s('item',v)} p="소프트웨어 개발"/></div>
        <div className="border-t border-white/[.06] mt-5 pt-5">
          <p className="text-[11px] font-semibold text-[#63636E] uppercase tracking-wider mb-4">추가 정보</p>
          <div className="mb-3"><label className="block text-[11px] font-medium text-[#63636E] mb-1.5">서비스/상품 설명</label><textarea value={f.service_desc} onChange={e=>s('service_desc',e.target.value)} placeholder="제공하는 서비스를 설명해주세요" className="inp min-h-[80px]"/></div>
          <I l="타겟 고객" v={f.target_customer} c={v=>s('target_customer',v)} p="30~40대 사업자" cls="mb-3"/>
          <div className="mb-3"><label className="block text-[11px] font-medium text-[#63636E] mb-1.5">주요 실적/경력</label><textarea value={f.track_record} onChange={e=>s('track_record',e.target.value)} placeholder="관련 경력이나 실적" className="inp min-h-[80px]"/></div>
          <div className="grid grid-cols-2 gap-3"><I l="이메일" v={f.email} c={v=>s('email',v)} p="hello@example.com"/><I l="전화번호" v={f.phone} c={v=>s('phone',v)} p="010-0000-0000"/></div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={()=>router.push('/market')} className="px-4 py-2 border border-white/10 rounded-md text-[12.5px] text-[#A1A1AA]">건너뛰기</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-[#00D4AA] rounded-md text-[12.5px] font-semibold text-[#09090B] disabled:opacity-50">{saving?'저장 중...':'저장 →'}</button>
        </div>
      </div>
      {msg&&<div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#232328] text-white px-5 py-2.5 rounded-lg text-[13px] border border-white/10 z-50 animate-in">{msg}</div>}
    </div>
  )
}
function I({l,v,c,p='',t='text',cls=''}:{l:string;v:string;c:(v:string)=>void;p?:string;t?:string;cls?:string}){return<div className={cls}><label className="block text-[11px] font-medium text-[#63636E] mb-1.5">{l}</label><input type={t} value={v||''} onChange={e=>c(e.target.value)} placeholder={p} className="inp"/></div>}
