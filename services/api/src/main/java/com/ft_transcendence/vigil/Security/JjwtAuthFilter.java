package com.ft_transcendence.vigil.Security;

import com.ft_transcendence.vigil.Services.UserDetailsServiceImpl;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@AllArgsConstructor
public class JjwtAuthFilter extends OncePerRequestFilter {
    private final JjwtService jjwtService;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {


        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer "))
        {
            filterChain.doFilter(request,response);
            return;
        }
        String accessToken = header.substring(7);

        try{
            String userName = jjwtService.getUserName(accessToken);
            if (userName != null && SecurityContextHolder.getContext().getAuthentication() == null)
            {
                UserDetails userDetails = userDetailsService.loadUserByUsername(userName);
                if (jjwtService.isTokenValid(accessToken,userDetails))
                {
                     UsernamePasswordAuthenticationToken token =  UsernamePasswordAuthenticationToken.authenticated(userDetails,null,userDetails.getAuthorities());
                     token.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                     SecurityContextHolder.getContext().setAuthentication(token);
                }

            }
        }
        catch (Exception e)
        {
            logger.debug("JWT AUTH FAILED!",e);
            filterChain.doFilter(request,response);
            return;
        }
        filterChain.doFilter(request,response);



    }
}
